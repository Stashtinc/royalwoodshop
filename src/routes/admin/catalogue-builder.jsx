import { useEffect, useMemo, useRef, useState } from 'react'
import { Form, Link, useLoaderData, useSubmit } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { thumbSrc } from '../../lib/images'
import { AVAILABILITY_LABEL } from '../../lib/catalogue-constants'
import {
  getPrintCatalogue, updatePrintCatalogue, addProductsToCatalogue,
  removeItemFromCatalogue, searchProductsForCatalogue, reorderCatalogueItems,
} from '../../lib/print-catalogues.server'
import SectionTabs from '../../components/admin/SectionTabs'
import { useDragReorder } from '../../components/admin/useDragReorder'

const PICKER_PAGE = 50

export async function loader({ request, params }) {
  await requireUser(request)
  const catalogue = await getPrintCatalogue(params.id)
  if (!catalogue) throw new Response('Not found', { status: 404 })
  const q = new URL(request.url).searchParams.get('q') ?? ''
  const results = await searchProductsForCatalogue(q, PICKER_PAGE)
  return { catalogue, q, results, hasMore: results.length === PICKER_PAGE }
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

const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'
const card = 'rounded-xl border border-gray-200 bg-white p-6'

export default function CatalogueBuilder() {
  const { catalogue, q: initialQ, results: firstPage, hasMore: firstHasMore } = useLoaderData()
  const inCatalogue = new Set(catalogue.items.map((i) => i.productId))

  // Picker: batches load as you scroll; typing searches from the first batch again.
  const [q, setQ] = useState(initialQ)
  const [results, setResults] = useState(firstPage)
  const [hasMore, setHasMore] = useState(firstHasMore)
  const [loading, setLoading] = useState(false)
  const qRef = useRef(initialQ)
  const sentinelRef = useRef(null)
  const skipFirstSearch = useRef(true)

  const loadBatch = async (query, offset, replace) => {
    setLoading(true)
    const res = await fetch(`/admin/catalogue-products?q=${encodeURIComponent(query)}&offset=${offset}`)
    const data = await res.json()
    // Ignore a batch that arrives after the search has changed.
    if (qRef.current !== query) return
    setResults((prev) => {
      if (replace) return data.results
      const seen = new Set(prev.map((p) => p.id))
      return [...prev, ...data.results.filter((p) => !seen.has(p.id))]
    })
    setHasMore(data.hasMore)
    setLoading(false)
  }

  useEffect(() => {
    if (skipFirstSearch.current) { skipFirstSearch.current = false; return }
    const timer = setTimeout(() => { qRef.current = q; loadBatch(q, 0, true) }, 250)
    return () => clearTimeout(timer)
    // loadBatch is recreated each render; only the query matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) loadBatch(qRef.current, results.length, false)
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
  const [selected, setSelected] = useState(() => new Set())
  const addable = results.filter((p) => !inCatalogue.has(p.id))
  const allChecked = addable.length > 0 && addable.every((p) => selected.has(p.id))
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(addable.map((p) => p.id)))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
        <Link to="/admin/catalogue" className="text-sm text-gray-500 hover:text-gray-800">← All catalogues</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left two-thirds: product table with bulk selection */}
        <div className="lg:col-span-2">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); qRef.current = e.target.value }}
            placeholder="Search name, product code, Part ID or slug"
            className={`${input} w-full`}
          />

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
                          checked={selected.has(p.id)} onChange={() => toggle(p.id)}
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
            <p className="mt-2 text-sm text-gray-500">
              {selected.size === 0 ? 'Tick products in the table, then add them here.' : `${selected.size} selected`}
            </p>
            <Form method="post" onSubmit={() => setSelected(new Set())} className="mt-4 flex gap-2">
              <input type="hidden" name="intent" value="add-many" />
              <input type="hidden" name="productIds" value={[...selected].join(',')} />
              <button type="submit" disabled={selected.size === 0}
                className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:cursor-not-allowed disabled:opacity-40">
                Add {selected.size || ''} to catalogue
              </button>
              {selected.size > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className="px-2 text-sm text-gray-500 hover:text-gray-800">Clear</button>
              )}
            </Form>
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
    </div>
  )
}
