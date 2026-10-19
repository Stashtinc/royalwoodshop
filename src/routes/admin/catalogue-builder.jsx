import { useEffect, useMemo, useRef, useState } from 'react'
import { Form, Link, useActionData, useLoaderData, useSubmit } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { saveUpload } from '../../lib/uploads.server'
import { thumbSrc } from '../../lib/images'
import { AVAILABILITY_LABEL, SPECIES } from '../../lib/catalogue-constants'
import {
  getPrintCatalogue, updatePrintCatalogue, addProductsToCatalogue,
  removeItemFromCatalogue, searchProductsForCatalogue, reorderCatalogueItems, listCategoryOptions,
  updateCover, setCoverBackground, removeProductsFromCatalogue,
} from '../../lib/print-catalogues.server'
import SectionTabs from '../../components/admin/SectionTabs'
import CataloguePreview from '../../components/admin/CataloguePreview'
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

  if (intent === 'sync-products') {
    const addIds = String(f.get('addIds') ?? '').split(',').map(Number).filter(Boolean)
    const removeIds = String(f.get('removeIds') ?? '').split(',').map(Number).filter(Boolean)
    if (addIds.length) await addProductsToCatalogue(id, addIds)
    if (removeIds.length) await removeProductsFromCatalogue(id, removeIds)
    await log(user, 'print_catalogue.sync_products', { entityType: 'print_catalogue', entityId: id, details: { addIds, removeIds } })
    return null
  }

  if (intent === 'add-many') {
    const productIds = String(f.get('productIds') ?? '').split(',').map(Number).filter(Boolean)
    if (productIds.length) {
      await addProductsToCatalogue(id, productIds)
      await log(user, 'print_catalogue.add_products', { entityType: 'print_catalogue', entityId: id, details: { productIds } })
    }
  }

  if (intent === 'cover') {
    await updateCover(id, { title: String(f.get('title') ?? ''), coverDate: String(f.get('coverDate') ?? '') })
    await log(user, 'print_catalogue.cover', { entityType: 'print_catalogue', entityId: id })
    return null
  }

  if (intent === 'cover-background') {
    const saved = await saveUpload(f.get('file'), { slug: 'print-catalogue-cover' })
    if (saved.error) return { coverError: saved.error }
    await setCoverBackground(id, saved.storageKey)
    await log(user, 'print_catalogue.cover_background', { entityType: 'print_catalogue', entityId: id })
    return null
  }

  if (intent === 'cover-background-remove') {
    await setCoverBackground(id, null)
    return null
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
  const { catalogue, q: initialQ, results: firstPage, hasMore: firstHasMore, categories } = useLoaderData()
  const actionData = useActionData()
  // Right-hand column: Layout (products to add, preview) or Settings (title, show prices).
  const [rightTab, setRightTab] = useState('layout')
  // Cover title and date, held here so the cover preview updates as you type.
  const [coverTitle, setCoverTitle] = useState(catalogue.title)
  const [coverDateText, setCoverDateText] = useState(catalogue.coverDate ?? '')
  useEffect(() => { setCoverTitle(catalogue.title) }, [catalogue.title])
  useEffect(() => { setCoverDateText(catalogue.coverDate ?? '') }, [catalogue.coverDate])
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

  // Ticks in the product table. Starts from the products already in the catalogue;
  // ticking adds, unticking removes. Save changes applies both.
  const fromCatalogue = () => new Map(catalogue.items.map((i) => [i.productId, { id: i.productId, name: i.name, image: i.image, imageWidth: i.imageWidth }]))
  const [selected, setSelected] = useState(fromCatalogue)
  const [view, setView] = useState('all')
  const selectedKey = [...selected.keys()].sort((x, y) => x - y).join(',')
  useEffect(() => {
    if (view !== 'selected') return
    setHasMore(false)
    if (!selectedKey) { setResults([]); return }
    fetch(`/admin/catalogue-products?ids=${selectedKey}`).then((r) => r.json()).then((d) => setResults(d.results))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedKey])
  useEffect(() => {
    if (view === 'all') loadBatch(latestRef.current, 0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  useEffect(() => { setSelected(fromCatalogue()) }, [catalogue.items])
  const allChecked = results.length > 0 && results.every((p) => selected.has(p.id))
  const toggle = (p) => setSelected((prev) => {
    const next = new Map(prev)
    if (next.has(p.id)) next.delete(p.id)
    else next.set(p.id, p)
    return next
  })
  const toggleAll = () => setSelected(allChecked ? new Map() : new Map(results.map((p) => [p.id, p])))
  const addIds = [...selected.keys()].filter((id) => !inCatalogue.has(id))
  const removeIds = [...inCatalogue].filter((id) => !selected.has(id))
  const changed = addIds.length + removeIds.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
        <Link to="/admin/catalogue" className="text-sm text-gray-500 hover:text-gray-800">← All catalogues</Link>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {/* Left two-thirds: product table with bulk selection */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search.q}
              onChange={(e) => setFilter('q', e.target.value)}
              placeholder="Search name, product code, Part ID or slug"
              className={`${input} min-w-[12rem] flex-1`}
            />
            <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5 text-sm">
              {[['all', 'All'], ['selected', `Selected (${selected.size})`]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setView(key)}
                  className={`rounded-md px-3 py-1 ${view === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  {label}
                </button>
              ))}
            </div>
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

          {changed && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
  {changed && (
    <Form method="post" className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="intent" value="sync-products" />
      <input type="hidden" name="addIds" value={addIds.join(',')} />
      <input type="hidden" name="removeIds" value={removeIds.join(',')} />
      <button type="submit" className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
        Save changes
      </button>
      <span className="text-xs text-gray-500">{addIds.length} to add, {removeIds.length} to remove</span>
      <button type="button" onClick={() => setSelected(fromCatalogue())} className="px-2 text-sm text-gray-500 hover:text-gray-800">Reset</button>
    </Form>
  )}
            </div>
          )}
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[860px] w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={toggleAll}
                      disabled={results.length === 0} className="h-4 w-4 rounded border-gray-300 accent-royal-blue" />
                  </th>
                  <th className="px-2 py-3"><span className="sr-only">Picture</span></th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Species</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Views</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">No products match.</td></tr>
                )}
                {results.map((p) => {
                  const added = inCatalogue.has(p.id)
                  return (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-amber-50">
                      <td className="px-4 py-2">
                        <input type="checkbox" aria-label={`Select ${p.name}`}
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
                      <td className="px-4 py-2 text-gray-600">{p.views ?? 0}</td>
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
        {/* Right column scrolls on its own while the page stays put */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          <section className={card}>
            <div className="flex gap-6 border-b border-gray-200">
              {[['layout', 'Layout'], ['settings', 'Settings']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setRightTab(key)}
                  className={`-mb-px border-b-2 pb-2 font-serif text-2xl font-bold ${rightTab === key ? 'border-royal-blue text-tundora' : 'border-transparent text-gray-400 hover:text-tundora'}`}>
                  {label}
                </button>
              ))}
            </div>
            {rightTab === 'settings' ? (
              <div className="mt-5">
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
              </div>
            ) : (
              <>
            <p className="mt-1 text-xs text-gray-500">Tap a page to list what is on it below.</p>
            <div className="mt-4">
              <CataloguePreview
                title={coverTitle}
                coverDate={coverDateText}
                coverImage={catalogue.coverImageKey}
                coverOptions={
                  <div className="space-y-4">
                    <Form method="post" className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
                      <input type="hidden" name="intent" value="cover" />
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        Title
                        <input name="title" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-gray-600">
                        Date
                        <input name="coverDate" value={coverDateText} onChange={(e) => setCoverDateText(e.target.value)} placeholder="Blank uses the print date" className={input} />
                      </label>
                      <div>
                        <button type="submit" className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">Save cover</button>
                      </div>
                    </Form>
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-700">Background image</p>
                      <p className="text-xs text-gray-500">
                        {catalogue.coverImageKey ? 'A background is set. It fills the cover behind the logo and title.' : 'No background. The cover is plain white.'}
                      </p>
                      <Form method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="intent" value="cover-background" />
                        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
                        <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400">Upload</button>
                      </Form>
                      {catalogue.coverImageKey && (
                        <Form method="post">
                          <input type="hidden" name="intent" value="cover-background-remove" />
                          <button type="submit" className="text-sm text-red-600 hover:text-red-800">Remove background</button>
                        </Form>
                      )}
                      {actionData?.coverError && <p className="text-sm text-red-600">{actionData.coverError}</p>}
                    </div>
                  </div>
                }
                order={order}
                showPrices={showPrices}
                itemProps={itemProps}
                removeForm={(item) => (
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="itemId" value={item.itemId} />
                    <button type="submit" aria-label="Remove" title="Remove" className="px-1 text-lg leading-none text-red-600 hover:text-red-800">×</button>
                  </Form>
                )}
              />
            </div>
              </>
            )}
          </section>
        </div>
      </div>

    </div>
  )
}
