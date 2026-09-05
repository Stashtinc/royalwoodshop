import { useEffect, useRef } from 'react'
import { Link, Form, useLoaderData, useSearchParams, useSubmit, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listProducts, listCategories } from '../../lib/admin-queries.server'
import { SPECIES, AVAILABILITY, AVAILABILITY_LABEL } from '../../lib/catalogue-constants'
import { thumbSrc } from '../../lib/images'
import Pagination from '../../components/admin/Pagination'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
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
    }),
    listCategories(),
  ])
  return { ...data, categoryOptions }
}

const MISSING_LABEL = {
  species: 'missing species',
  availability: 'missing availability',
  description: 'missing description',
}

export default function Products() {
  const { rows, total, page, pages, perPage, categoryOptions } = useLoaderData()
  const [params] = useSearchParams()
  const missing = params.get('missing') ?? ''
  const q = params.get('q') ?? ''
  const filterCategory = params.get('category') ?? ''
  const filterSpecies = params.get('species') ?? ''
  const filterAvailability = params.get('availability') ?? ''

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
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-serif text-2xl font-bold text-tundora">Products</h1>
        <p className="text-sm text-gray-500">
          {total} {missing ? MISSING_LABEL[missing] : 'total'}
        </p>
        {missing && <Link to="/admin/products" className="text-sm text-royal-blue underline">clear filter</Link>}
      </div>

      <Form id="products-filter" method="get" role="search" className="flex max-w-md gap-2">
        {missing && <input type="hidden" name="missing" value={missing} />}
        <div className="relative flex-1">
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
        {/* Still works without JavaScript. */}
        <noscript>
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:border-gray-400">Search</button>
        </noscript>
      </Form>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} />

      <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white transition-opacity ${searching ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-xs tracking-wide text-gray-600 uppercase">
              <th className="w-14 px-4 pt-2.5 pb-1" />
              <th className="px-4 pt-2.5 pb-1">Code</th>
              <th className="px-4 pt-2.5 pb-1">Name</th>
              <th className="px-4 pt-2.5 pb-1">Category</th>
              <th className="px-4 pt-2.5 pb-1">Species</th>
              <th className="px-4 pt-2.5 pb-1">Availability</th>
              <th className="px-4 pt-2.5 pb-1" />
            </tr>
            <tr>
              <th className="w-14 px-4 pb-2" />
              <th className="px-4 pb-2" />
              <th className="px-4 pb-2" />
              <th className="px-4 pb-2">
                <select
                  value={filterCategory}
                  onChange={(e) => { const f = e.currentTarget.form; setTimeout(() => submit(f, { replace: true }), 0) }}
                  name="category"
                  form="products-filter"
                  className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal text-gray-700 normal-case tracking-normal outline-none focus:border-royal-blue"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </th>
              <th className="px-4 pb-2">
                <select
                  value={filterSpecies}
                  onChange={(e) => { const f = e.currentTarget.form; setTimeout(() => submit(f, { replace: true }), 0) }}
                  name="species"
                  form="products-filter"
                  className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal text-gray-700 normal-case tracking-normal outline-none focus:border-royal-blue"
                >
                  <option value="">All species</option>
                  {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </th>
              <th className="px-4 pb-2">
                <select
                  value={filterAvailability}
                  onChange={(e) => { const f = e.currentTarget.form; setTimeout(() => submit(f, { replace: true }), 0) }}
                  name="availability"
                  form="products-filter"
                  className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal text-gray-700 normal-case tracking-normal outline-none focus:border-royal-blue"
                >
                  <option value="">All</option>
                  {AVAILABILITY.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </th>
              <th className="px-4 pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
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
                  <Link to={`/admin/products/${r.id}`} className="text-sm text-royal-blue hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />
    </div>
  )
}
