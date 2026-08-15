import { Link, Form, useLoaderData, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listPosts } from '../../lib/posts.server'
import Pagination from '../../components/admin/Pagination'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const allowed = [25, 50, 100]
  const requested = Number(url.searchParams.get('perPage') ?? 25)
  return listPosts({
    status: url.searchParams.get('status') ?? 'all',
    q: url.searchParams.get('q') ?? '',
    page: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
    perPage: allowed.includes(requested) ? requested : 25,
  })
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Posts() {
  const { rows, total, page, pages, perPage } = useLoaderData()
  const [params] = useSearchParams()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-tundora">Journal</h1>
        <p className="text-sm text-gray-500">{total} articles</p>
        <Link to="/admin/posts/new"
          className="ml-auto rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
          Write an article
        </Link>
      </div>

      <Form method="get" role="search" className="max-w-md">
        <input name="q" type="search" defaultValue={params.get('q') ?? ''}
          placeholder="Search articles"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue" />
      </Form>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
            <tr>
              <th className="w-16 px-4 py-2.5" />
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Categories</th>
              <th className="px-4 py-2.5">Published</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pl-4">
                  {p.featuredImage
                    ? <img src={p.featuredImage} alt="" loading="lazy"
                        className="h-11 w-14 rounded object-cover ring-1 ring-gray-200" />
                    : <div className="h-11 w-14 rounded bg-gray-100 ring-1 ring-gray-200" />}
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/admin/posts/${p.id}`} className="font-medium text-tundora hover:text-royal-blue">
                    {p.title}
                  </Link>
                  <p className="font-mono text-[11px] text-gray-400">/{p.slug}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{p.categories.join(', ') || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {p.publishedAt ? dateFormat.format(new Date(p.publishedAt)) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ring-1 ${
                    p.status === 'published'
                      ? 'bg-green-50 text-green-800 ring-green-200'
                      : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No articles match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />
    </div>
  )
}
