import { useEffect, useMemo, useRef, useState } from 'react'
import { Form, Link, useLoaderData, useSubmit } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { thumbSrc } from '../../lib/images'
import { AVAILABILITY_LABEL, SPECIES } from '../../lib/catalogue-constants'
import {
  getPrintCatalogue, updatePrintCatalogue, addProductsToCatalogue,
  removeItemFromCatalogue, searchProductsForCatalogue, reorderCatalogueItems, listCategoryOptions,
} from '../../lib/print-catalogues.server'
import SectionTabs from '../../components/admin/SectionTabs'
import logoBlue from '../../assets/images/logo-blue.svg'
import FilterPill from '../../components/admin/FilterPill'
import { useDragReorder } from '../../components/admin/useDragReorder'

const PICKER_PAGE = 50

export async function loader({ request, params }) {
  await requireUser(request)
  const catalogue = await getPrintCatalogue(params.id)
  if (!catalogue) throw new Response('Not found', { status: 404 })
  const q = new URL(request.url).searchParams.get('q') ?? ''
  const results = await searchProductsForCatalogue(q, PICKER_PAGE)
  const categories = await listCategoryOptions()
  return { catalogue, q, results, hasMore: results.length === PICKER_PAGE, categories }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = f.get('intent')
  const id = Number(params.id)

  if (intent === 'save') {
    const title = String(f.get('title') ?? '')
    const showPrices = f.get('showPrices') === 'on'
    await updatePrintCatalogue(id, { title, showPrices })
    await log(user, 'print_catalogue.update', { entityType: 'print_catalogue', entityId: id, entityLabel: title.trim() || 'Product Catalogue' })
  }

  if (intent === 'add-many') {
    const productIds = String(f.get('productIds') ?? '').split(',').map(Number).filter(Boolean)
    if (productIds.length) {
      await addProductsToCatalogue(id, productIds)
      await log(user, 'print_catalogue.add_products', { entityType: 'print_catalogue', entityId: id, details: { productIds } })
    }
  }

  if (intent === 'reorder') {
    await reorderCatalogueItems(id, String(f.get('ids') ?? '').split(','))
  }

  if (intent === 'remove') {
    const itemId = Number(f.get('itemId'))
    await removeItemFromCatalogue(id, itemId)
    await log(user, 'print_catalogue.remove_product', { entityType: 'print_catalogue', entityId: id, details: { itemId } })
  }

  return null
}

// How a product's prices read in the preview: each species, or the product price when it has none.
function priceLines(item) {
  const money = (v) => (v == null || v === '' ? null : `$${Number(v).toFixed(2)}`)
  if (item.prices?.length) {
    return item.prices.map((p) => ({
      label: p.species,
      price: money(p.price),
      sale: money(p.salePrice),
    }))
  }
  if (item.price != null) return [{ label: null, price: money(item.price), sale: money(item.salePrice) }]
  return []
}

const PREVIEW_DATE = () => new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'
const card = 'rounded-xl border border-gray-200 bg-white p-6'

export default function CatalogueBuilder() {
  const { catalogue, q: initialQ, results: firstPage, hasMore: firstHasMore, categories } = useLoaderData()
  const inCatalogue = new Set(catalogue.items.map((i) => i.productId))

  // Picker: batches load as you scroll. A new search or filter starts again from the first batch.
  const [search, setSearch] = useState({ q: initialQ, category: '', species: '', status: '' })
  const [results, setResults] = useState(firstPage)
  const [hasMore, setHasMore] = useState(firstHasMore)
  const [loading, setLoading] = useState(false)
  const latestRef = useRef(search)
  const sentinelRef = useRef(null)
  const skipFirstSearch = useRef(true)
  const sameSearch = (x, y) => x.q === y.q && x.category === y.category && x.species === y.species && x.status === y.status

  const loadBatch = async (s, offset, replace) => {
    setLoading(true)
    const sp = new URLSearchParams({ q: s.q, offset: String(offset), category: s.category, species: s.species, status: s.status })
    const res = await fetch(`/admin/catalogue-products?${sp}`)
    const data = await res.json()
    // Ignore a batch that arrives after the search has changed.
    if (!sameSearch(latestRef.current, s)) return
    setResults((prev) => {
      if (replace) return data.results
      const seen = new Set(prev.map((p) => p.id))
      return [...prev, ...data.results.filter((p) => !seen.has(p.id))]
    })
    setHasMore(data.hasMore)
    setLoading(false)
  }

  const setFilter = (key, value) => setSearch((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (skipFirstSearch.current) { skipFirstSearch.current = false; return }
    latestRef.current = search
    const timer = setTimeout(() => loadBatch(search, 0, true), 250)
    return () => clearTimeout(timer)
    // loadBatch is recreated each render; only the search matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) loadBatch(latestRef.current, results.length, false)
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, results.length])

  // Settings: the switch saves at once, the title when the field loses focus.
  const titleRef = useRef(null)
  const submit = useSubmit()
  const [showPrices, setShowPrices] = useState(catalogue.showPrices)
  const saveSettings = (change) => submit({
    intent: 'save',
    title: change.title ?? titleRef.current?.value ?? catalogue.title,
    showPrices: (change.showPrices ?? showPrices) ? 'on' : '',
  }, { method: 'post' })

  // Products in the catalogue, drag to reorder. The hook needs an id on each row.
  const rows = useMemo(() => catalogue.items.map((i) => ({ ...i, id: i.itemId })), [catalogue.items])
  const { order, itemProps } = useDragReorder(rows)

  // Bulk selection in the product table.
  // Keeps each ticked product (for its thumbnail and name), keyed by id.
  const [selected, setSelected] = useState(() => new Map())
  const addable = results.filter((p) => !inCatalogue.has(p.id))
  const allChecked = addable.length > 0 && addable.every((p) => selected.has(p.id))
  const toggle = (p) => setSelected((prev) => {
    const next = new Map(prev)
    if (next.has(p.id)) next.delete(p.id)
    else next.set(p.id, p)
    return next
  })
  const toggleAll = () => setSelected(allChecked ? new Map() : new Map(addable.map((p) => [p.id, p])))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
        <Link to="/admin/catalogue" className="text-sm text-gray-500 hover:text-gray-800">← All catalogues</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left two-thirds: product table with bulk selection */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search.q}
              onChange={(e) => setFilter('q', e.target.value)}
              placeholder="Search name, product code, Part ID or slug"
              className={`${input} min-w-[12rem] flex-1`}
            />
            <FilterPill
              label="All types"
              value={search.status}
              options={[
                { value: '', label: 'All types' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Drafts' },
              ]}
              onChange={(v) => setFilter('status', v)}
            />
            <FilterPill
              label="All categories"
              value={search.category}
              options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
              onChange={(v) => setFilter('category', v)}
            />
            <FilterPill
              label="All species"
              value={search.species}
              options={[{ value: '', label: 'All species' }, ...SPECIES.map((sp) => ({ value: sp, label: sp }))]}
              onChange={(v) => setFilter('species', v)}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={toggleAll}
                      disabled={addable.length === 0} className="h-4 w-4 rounded border-gray-300 accent-royal-blue" />
                  </th>
                  <th className="px-2 py-3"><span className="sr-only">Picture</span></th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Species</th>
                  <th className="px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No products match.</td></tr>
                )}
                {results.map((p) => {
                  const added = inCatalogue.has(p.id)
                  return (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-amber-50">
                      <td className="px-4 py-2">
                        <input type="checkbox" aria-label={`Select ${p.name}`} disabled={added}
                          checked={selected.has(p.id)} onChange={() => toggle(p)}
                          className="h-4 w-4 rounded border-gray-300 accent-royal-blue disabled:opacity-40" />
                      </td>
                      <td className="px-2 py-2">
                        {p.image ? (
                          <div className="h-11 w-11 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                            <img src={thumbSrc(p.image, p.imageWidth)} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />
                          </div>
                        ) : <div className="h-11 w-11 rounded-lg bg-gray-100" />}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{p.productCode ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-800">
                        {p.name}
                        {added && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">In catalogue</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{p.category ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{p.species ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{p.availability ? (AVAILABILITY_LABEL[p.availability] ?? p.availability) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} className="py-3 text-center text-xs text-gray-500">
            {loading ? 'Loading…' : hasMore ? 'Scroll for more' : `${results.length} product${results.length === 1 ? '' : 's'} · archived products are not listed`}
          </div>
        </div>

        {/* Right third: settings, add, and the print order */}
        <div className="flex flex-col gap-6">
          <section className={card}>
            <h2 className="font-serif text-lg font-bold text-tundora">Catalogue</h2>
            <div className="mt-4 flex flex-col gap-5">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Title
                <input
                  ref={titleRef}
                  defaultValue={catalogue.title}
                  onBlur={(e) => { if (e.currentTarget.value !== catalogue.title) saveSettings({ title: e.currentTarget.value }) }}
                  className={input}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">Show prices</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPrices}
                  onClick={() => { const next = !showPrices; setShowPrices(next); saveSettings({ showPrices: next }) }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${showPrices ? 'bg-royal-blue' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${showPrices ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-serif text-lg font-bold text-tundora">Add products</h2>
            {selected.size === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Tick products in the table, then add them here.</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                {[...selected.values()].map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    {p.image ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                        <img src={thumbSrc(p.image, p.imageWidth)} alt="" className="h-full w-full object-contain p-0.5" />
                      </div>
                    ) : <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100" />}
                    <span className="flex-1 truncate text-sm text-gray-800">{p.name}</span>
                    <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.name}`} className="text-gray-400 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            )}
            {selected.size > 0 && (
              <Form method="post" onSubmit={() => setSelected(new Map())} className="mt-4 flex gap-2">
                <input type="hidden" name="intent" value="add-many" />
                <input type="hidden" name="productIds" value={[...selected.keys()].join(',')} />
                <button type="submit" disabled={selected.size === 0}
                  className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:cursor-not-allowed disabled:opacity-40">
                  Add {selected.size || ''} to catalogue
                </button>
                {selected.size > 0 && (
                  <button type="button" onClick={() => setSelected(new Map())} className="px-2 text-sm text-gray-500 hover:text-gray-800">Clear</button>
                )}
              </Form>
            )}
          </section>

          <section className={card}>
            <h2 className="font-serif text-lg font-bold text-tundora">In this catalogue ({catalogue.items.length})</h2>
            {catalogue.items.length > 1 && <p className="mt-1 text-xs text-gray-500">Drag a row to change the print order.</p>}
            {catalogue.items.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No products yet.</p>
            ) : (
              <ol className="mt-4 divide-y divide-gray-100">
                {order.map((item, i) => (
                  <li key={item.itemId} {...itemProps(item)} className="flex cursor-grab items-center justify-between gap-3 py-2 data-[dragging=true]:opacity-50">
                    <span className="text-sm text-gray-800">
                      <span className="mr-2 text-gray-400">{i + 1}.</span>
                      {item.name}
                      {item.productCode && <span className="ml-2 font-mono text-xs text-gray-500">{item.productCode}</span>}
                      {item.status === 'archived' && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Archived: not printed</span>
                      )}
                    </span>
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="itemId" value={item.itemId} />
                      <button type="submit" className="text-sm text-red-600 hover:text-red-800">Remove</button>
                    </Form>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Preview: how the printed catalogue will look, in print order */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-gray-100 p-6">
        <h2 className="font-serif text-lg font-bold text-tundora">Preview</h2>
        <p className="mt-1 text-xs text-gray-500">How the printed catalogue will look. Page breaks in the PDF may differ.</p>
        <div className="mt-6 flex flex-col items-center gap-8">
          {/* Cover page */}
          <div className="flex aspect-[8.5/11] w-full max-w-[560px] flex-col items-center justify-between bg-white p-12 text-center shadow-md">
            <img src={logoBlue} alt="The Royal Wood Shop" className="h-16 w-auto" />
            <h3 className="font-serif text-4xl font-bold text-tundora">{catalogue.title}</h3>
            <p className="text-sm text-gray-500">{PREVIEW_DATE()}</p>
          </div>

          {/* Product pages, in print order */}
          {order.length > 0 && (
            <div className="w-full max-w-[560px] space-y-8 bg-white p-10 shadow-md">
              {order.map((item) => {
                const lines = [
                  ['Size', item.sizeDisplay],
                  ['Specifications', item.species],
                  ['Category', item.category],
                  ['Availability', item.availability ? (AVAILABILITY_LABEL[item.availability] ?? item.availability) : null],
                  ['Lead time', item.leadTime],
                ].filter(([, v]) => v)
                const prices = catalogue.showPrices ? priceLines(item) : []
                return (
                  <article key={item.itemId} className="flex gap-5 border-b border-gray-200 pb-8 last:border-0">
                    {item.image && (
                      <img src={thumbSrc(item.image, item.imageWidth)} alt="" className="h-28 w-28 shrink-0 object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-lg font-bold text-tundora">{item.name}</h4>
                      {item.productCode && <p className="font-mono text-xs text-gray-500">{item.productCode}</p>}
                      {item.description && <p className="mt-2 line-clamp-4 text-sm text-gray-700">{item.description}</p>}
                      {lines.length > 0 && (
                        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                          {lines.map(([label, value]) => (
                            <div key={label} className="contents">
                              <dt className="font-semibold text-gray-600">{label}</dt>
                              <dd className="text-gray-800">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {prices.length > 0 && (
                        <ul className="mt-3 space-y-0.5 text-sm">
                          {prices.map((p, i) => (
                            <li key={i} className="text-gray-800">
                              {p.label && <span className="mr-2 text-gray-600">{p.label}</span>}
                              {p.sale ? (
                                <><span className="mr-2 text-gray-400 line-through">{p.price}</span><span className="font-semibold">{p.sale}</span></>
                              ) : <span className="font-semibold">{p.price}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
