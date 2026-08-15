import { Link, Form, useLoaderData, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listProducts } from '../../lib/admin-queries.server'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  return listProducts({
    q: url.searchParams.get('q') ?? '',
    page: Number(url.searchParams.get('page') ?? 1),
    missing: url.searchParams.get('missing') ?? '',
  })
}

const MISSING_LABEL = {
  species: 'missing species',
  availability: 'missing availability',
  description: 'missing description',
}

export default function Products() {
  const { rows, total, page, pages } = useLoaderData()
  const [params] = useSearchParams()
  const missing = params.get('missing') ?? ''
  const q = params.get('q') ?? ''

  const pageLink = (n) => {
    const p = new URLSearchParams(params)
    p.set('page', String(n))
    return `?${p}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-serif text-2xl font-bold text-tundora">Products</h1>
        <p className="text-sm text-gray-500">
          {total} {missing ? MISSING_LABEL[missing] : 'total'}
        </p>
        {missing && <Link to="/admin/products" className="text-sm text-royal-blue underline">clear filter</Link>}
      </div>

      <Form method="get" className="flex gap-2">
        {missing && <input type="hidden" name="missing" value={missing} />}
        <input name="q" defaultValue={q} placeholder="Search name, product code or slug"
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue" />
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:border-gray-400">Search</button>
      </Form>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
            <tr>
              <th className="w-14 px-4 py-2.5" />
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Species</th>
              <th className="px-4 py-2.5">Availability</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pl-4">
                  <Link to={`/admin/products/${r.id}`} className="block">
                    {r.image ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                        <img src={r.image} alt="" className="h-full w-full object-contain p-0.5" />
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
                    ? r.availability.replace('_', ' ')
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

      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && <Link to={pageLink(page - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5">Previous</Link>}
          <span className="text-gray-500">Page {page} of {pages}</span>
          {page < pages && <Link to={pageLink(page + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5">Next</Link>}
        </div>
      )}
    </div>
  )
}
