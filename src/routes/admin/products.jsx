import { useEffect, useRef, useState } from 'react'
import { Link, Form, useActionData, useLoaderData, useSearchParams, useSubmit, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listProducts, listCategories, bulkArchiveProducts, bulkPublishProducts, bulkDeleteProducts, activateProductsByIds, archiveProductsByIds } from '../../lib/admin-queries.server'
import { deleteUpload } from '../../lib/uploads.server'
import { syncProductsJson } from '../../lib/sync.server'
import { log } from '../../lib/activity.server'
import { AVAILABILITY_LABEL, SPECIES } from '../../lib/catalogue-constants'
import { thumbSrc } from '../../lib/images'
import Pagination from '../../components/admin/Pagination'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const savedId = url.searchParams.get('saved') ? Number(url.searchParams.get('saved')) : null
  const allowed = [25, 50, 100]
  const requested = Number(url.searchParams.get('perPage') ?? 25)
  const [data, categoryOptions] = await Promise.all([
    listProducts({
      q: url.searchParams.get('q') ?? '',
      page: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
      perPage: allowed.includes(requested) ? requested : 25,
      missing: url.searchParams.get('missing') ?? '',
      category: url.searchParams.get('category') ?? '',
      species: url.searchParams.get('species') ?? '',
      availability: url.searchParams.get('availability') ?? '',
      sortBy: url.searchParams.get('sortBy') ?? 'updated',
      sortDir: url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
      status: url.searchParams.get('status') === 'archived' ? 'archived' : 'active',
    }),
    listCategories(),
  ])
  return { ...data, categoryOptions, savedId }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const url = new URL(request.url)
  const f = await request.formData()
  const intent = f.get('intent')
  if (intent === 'archive-selected') {
    const ids = f.getAll('productId').map(Number).filter(Boolean)
    if (!ids.length) return null
    const count = await archiveProductsByIds(ids)
    await log(user, 'product.status', {
      entityType: 'product',
      entityLabel: `Archive (${ids.length} products)`,
      details: { from: 'active', to: 'archived', count },
    })
    await syncProductsJson()
    return { archived: count }
  }

  if (intent === 'activate-selected') {
    const ids = f.getAll('productId').map(Number).filter(Boolean)
    if (!ids.length) return null
    const count = await activateProductsByIds(ids)
    await log(user, 'product.status', {
      entityType: 'product',
      entityLabel: `Bulk activate (${ids.length} products)`,
      details: { from: 'archived', to: 'published', count },
    })
    await syncProductsJson()
    return { activated: count }
  }

  if (intent === 'bulk-delete') {
    const ids = f.getAll('productId').map(Number).filter(Boolean)
    if (!ids.length) return null
    const storageKeys = await bulkDeleteProducts(ids)
    for (const key of storageKeys) await deleteUpload(key)
    await log(user, 'product.deleted', {
      entityType: 'product',
      entityLabel: `Bulk delete (${ids.length} products)`,
      details: { count: ids.length },
    })
    await syncProductsJson()
    return { deleted: ids.length }
  }

  if (intent !== 'bulk-archive' && intent !== 'bulk-publish') return null

  const filterArgs = {
    q: f.get('q') ?? '',
    missing: f.get('missing') ?? '',
    category: f.get('category') ?? '',
    species: f.get('species') ?? '',
    availability: f.get('availability') ?? '',
  }

  if (intent === 'bulk-publish') {
    const count = await bulkPublishProducts(filterArgs)
    await log(user, 'product.status', {
      entityType: 'product',
      entityLabel: `Bulk publish (${f.get('q') || f.get('category') || 'filter'})`,
      details: { from: 'draft', to: 'published', count },
    })
    await syncProductsJson()
    return { published: count }
  }

  const count = await bulkArchiveProducts(filterArgs)
  await log(user, 'product.status', {
    entityType: 'product',
    entityLabel: `Bulk archive (${f.get('q') || 'filter'})`,
    details: { from: 'various', to: 'archived', count },
  })
  await syncProductsJson()
  return { archived: count }
}

const MISSING_LABEL = {
  species: 'missing species',
  availability: 'missing availability',
  description: 'missing description',
}

export default function Products() {
  const { rows, total, page, pages, perPage, categoryOptions, sortBy, sortDir, savedId } = useLoaderData()
  const actionData = useActionData()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const species = params.get('species') ?? ''
  const statusFilter = params.get('status') === 'archived' ? 'archived' : 'active'
  const savedRowRef = useRef(null)

  useEffect(() => {
    if (!savedRowRef.current) return
    savedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    savedRowRef.current.classList.add('animate-row-flash')
  }, [savedId])
  function sortLink(col) {
    const next = new URLSearchParams(params)
    next.set('sortBy', col)
    next.set('sortDir', sortBy === col && sortDir === 'asc' ? 'desc' : 'asc')
    next.delete('page')
    return `?${next.toString()}`
  }

  function SortIndicator({ col }) {
    if (sortBy !== col) return (
      <span className="ml-1.5 flex flex-col gap-[1px] opacity-30">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 0L8 5H0z"/></svg>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 5L0 0H8z"/></svg>
      </span>
    )
    return (
      <span className="ml-1.5 text-royal-blue">
        {sortDir === 'asc'
          ? <svg width="10" height="10" viewBox="0 0 8 5" fill="currentColor"><path d="M4 0L8 5H0z"/></svg>
          : <svg width="10" height="10" viewBox="0 0 8 5" fill="currentColor"><path d="M4 5L0 0H8z"/></svg>
        }
      </span>
    )
  }

  const [bulkEdit, setBulkEdit] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (rows.every((r) => selectedIds.has(r.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)))
    }
  }

  function exitBulkEdit() {
    setBulkEdit(false)
    setSelectedIds(new Set())
  }

  const submit = useSubmit()
  const navigation = useNavigation()
  const timer = useRef(null)
  const inputRef = useRef(null)

  // Filters as you type. Debounced so a word is not five round trips, and
  // replace: true so the back button steps out of the list rather than back
  // through every keystroke.
  function onSearchChange(e) {
    const form = e.currentTarget.form
    clearTimeout(timer.current)
    timer.current = setTimeout(() => submit(form, { replace: true }), 250)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  // Keep the cursor in the box after the results reload.
  const searching = navigation.state !== 'idle' && navigation.location?.search !== undefined
  useEffect(() => {
    if (!searching && inputRef.current && document.activeElement !== inputRef.current) {
      const wasTyping = inputRef.current.dataset.typing === 'true'
      if (wasTyping) inputRef.current.focus()
    }
  }, [searching])

  return (
    <div className="flex flex-col gap-5">
      {actionData?.activated != null && (
        <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {actionData.activated} product{actionData.activated === 1 ? '' : 's'} activated and published.
        </p>
      )}
      {actionData?.archived != null && (
        <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {actionData.archived} product{actionData.archived === 1 ? '' : 's'} archived.
        </p>
      )}
      {actionData?.published != null && (
        <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {actionData.published} product{actionData.published === 1 ? '' : 's'} published.
        </p>
      )}
      {actionData?.deleted != null && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {actionData.deleted} product{actionData.deleted === 1 ? '' : 's'} deleted.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-2xl font-bold text-tundora">Products</h1>
          {statusFilter === 'archived' && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Archived</span>
          )}
          <p className="text-sm text-gray-500">
            {total} total
          </p>
          <Link
            to={statusFilter === 'archived' ? '/admin/products' : '?status=archived'}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {statusFilter === 'archived' ? '← Active products' : 'View archived'}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {bulkEdit ? (
            <>
              {selectedIds.size > 0 && statusFilter === 'archived' && (
                <Form method="post" onSubmit={() => exitBulkEdit()}>
                  <input type="hidden" name="intent" value="activate-selected" />
                  {[...selectedIds].map((id) => (
                    <input key={id} type="hidden" name="productId" value={id} />
                  ))}
                  <button type="submit"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    Activate {selectedIds.size} selected
                  </button>
                </Form>
              )}
              {selectedIds.size > 0 && statusFilter !== 'archived' && (
                <Form method="post" onSubmit={() => exitBulkEdit()}>
                  <input type="hidden" name="intent" value="archive-selected" />
                  {[...selectedIds].map((id) => (
                    <input key={id} type="hidden" name="productId" value={id} />
                  ))}
                  <button type="submit"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">
                    Archive {selectedIds.size} selected
                  </button>
                </Form>
              )}
              {selectedIds.size > 0 && (
                <Form method="post" onSubmit={(e) => {
                  if (!confirm(`Are you sure you want to delete ${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) e.preventDefault()
                  else exitBulkEdit()
                }}>
                  <input type="hidden" name="intent" value="bulk-delete" />
                  {[...selectedIds].map((id) => (
                    <input key={id} type="hidden" name="productId" value={id} />
                  ))}
                  <button type="submit"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    Delete {selectedIds.size} selected
                  </button>
                </Form>
              )}
              <button
                type="button"
                onClick={exitBulkEdit}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setBulkEdit(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                Bulk Edit
              </button>
              <Link
                to="/admin/products/new"
                className="flex items-center gap-1.5 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add New
              </Link>
            </>
          )}
        </div>
      </div>

      <Form id="products-filter" method="get" role="search" className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <input
            ref={inputRef}
            name="q"
            type="search"
            defaultValue={q}
            onChange={(e) => { e.currentTarget.dataset.typing = 'true'; onSearchChange(e) }}
            placeholder="Search name, product code or slug"
            aria-label="Search products"
            className="w-full rounded-lg border border-gray-300 py-2 pr-9 pl-9 text-sm outline-none focus:border-royal-blue"
          />
          <svg viewBox="0 0 18 18" aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8" cy="8" r="5.5" /><path d="M12.2 12.2 16 16" />
          </svg>
          {searching && (
            <svg viewBox="0 0 20 20" aria-hidden="true"
              className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="7" strokeOpacity="0.25" />
              <path d="M17 10a7 7 0 0 0-7-7" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <select
          name="category"
          defaultValue={category}
          onChange={(e) => submit(e.currentTarget.form, { replace: true })}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none focus:border-royal-blue"
        >
          <option value="">All types</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          name="species"
          defaultValue={species}
          onChange={(e) => submit(e.currentTarget.form, { replace: true })}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none focus:border-royal-blue"
        >
          <option value="">All species</option>
          {SPECIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <noscript>
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:border-gray-400">Search</button>
        </noscript>
      </Form>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} />

      <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white transition-opacity ${searching ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-xs font-bold tracking-wide text-gray-500 uppercase">
              {bulkEdit && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.id))}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-royal-blue"
                    title="Select all on this page"
                  />
                </th>
              )}
              <th className="w-14 px-4 py-3" />
              <th className="px-4 py-3">
                <Link to={sortLink('code')} className="inline-flex items-center gap-1 hover:text-royal-blue">Code<SortIndicator col="code" /></Link>
              </th>
              <th className="px-4 py-3">
                <Link to={sortLink('name')} className="inline-flex items-center gap-1 hover:text-royal-blue">Name<SortIndicator col="name" /></Link>
              </th>
              <th className="px-4 py-3">
                <Link to={sortLink('category')} className="inline-flex items-center gap-1 hover:text-royal-blue">Category<SortIndicator col="category" /></Link>
              </th>
              <th className="px-4 py-3">Species</th>
              <th className="px-4 py-3">
                <Link to={sortLink('availability')} className="inline-flex items-center gap-1 hover:text-royal-blue">Availability<SortIndicator col="availability" /></Link>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} ref={r.id === savedId ? savedRowRef : null} className={`border-b border-gray-100 last:border-0 ${bulkEdit && selectedIds.has(r.id) ? (statusFilter === 'archived' ? 'bg-amber-50' : 'bg-red-50') : ''}`}>
                {bulkEdit && (
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-royal-blue"
                    />
                  </td>
                )}
                <td className="py-2 pl-4">
                  <Link to={`/admin/products/${r.id}`} className="block">
                    {r.image ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                        <img src={thumbSrc(r.image, r.imageWidth)} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />
                        {r.imageCount > 1 && (
                          <span className="absolute right-0 bottom-0 rounded-tl bg-gray-900/70 px-1 text-[9px] leading-tight text-white">
                            {r.imageCount}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-[9px] leading-tight text-amber-700 ring-1 ring-amber-200">
                        no<br />image
                      </div>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.productCode || '—'}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/admin/products/${r.id}`} className="font-medium text-tundora hover:text-royal-blue">
                    {r.name}
                  </Link>
                  {r.flexAvailable && <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-800">flex</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.category ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {r.species?.length
                    ? r.species.join(', ')
                    : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">not set</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {r.availability
                    ? AVAILABILITY_LABEL[r.availability] ?? r.availability.replace(/_/g, ' ')
                    : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">not set</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {statusFilter === 'archived' && !bulkEdit && (
                      <Form method="post">
                        <input type="hidden" name="intent" value="activate-selected" />
                        <input type="hidden" name="productId" value={r.id} />
                        <button type="submit" className="text-sm text-green-700 hover:underline">Activate</button>
                      </Form>
                    )}
<Link to={`/admin/products/${r.id}`} className="text-sm text-royal-blue hover:underline">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={bulkEdit ? 8 : 7} className="px-4 py-10 text-center text-gray-500">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />
    </div>
  )
}
