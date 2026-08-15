import { Link, useLoaderData, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listActivity, listActions } from '../../lib/activity.server'
import Pagination from '../../components/admin/Pagination'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const allowed = [25, 50, 100]
  const requested = Number(url.searchParams.get('perPage') ?? 50)
  const [activity, actions] = await Promise.all([
    listActivity({
      page: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
      perPage: allowed.includes(requested) ? requested : 50,
      action: url.searchParams.get('action') ?? '',
      entityId: url.searchParams.get('product') ?? '',
    }),
    listActions(),
  ])
  return { ...activity, actions }
}

const ACTION_LABEL = {
  'product.updated': 'Product edited',
  'image.added': 'Images added',
  'image.updated': 'Image details changed',
  'image.deleted': 'Image removed',
  'image.reordered': 'Images reordered',
  'auth.login': 'Signed in',
}

const TONE = {
  'product.updated': 'bg-blue-50 text-blue-800 ring-blue-200',
  'image.added': 'bg-green-50 text-green-800 ring-green-200',
  'image.updated': 'bg-gray-100 text-gray-700 ring-gray-200',
  'image.deleted': 'bg-red-50 text-red-800 ring-red-200',
  'image.reordered': 'bg-gray-100 text-gray-700 ring-gray-200',
  'auth.login': 'bg-purple-50 text-purple-800 ring-purple-200',
}

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })

function describe(row) {
  const d = row.details
  if (!d) return null
  if (row.action === 'product.updated' && Array.isArray(d.changed)) {
    return (
      <ul className="mt-1 flex flex-col gap-0.5">
        {d.changed.map((c, i) => (
          <li key={i} className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">{c.field}</span>
            {': '}
            <span className="text-gray-400 line-through">{String(c.from).slice(0, 60)}</span>
            {' → '}
            <span>{String(c.to).slice(0, 60)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (row.action === 'image.added') return <p className="mt-1 text-xs text-gray-600">{d.count} file{d.count === 1 ? '' : 's'}</p>
  if (d.field) return <p className="mt-1 text-xs text-gray-600">{d.field}: {String(d.to).slice(0, 80)}</p>
  return null
}

export default function Logs() {
  const { rows, total, page, pages, perPage, actions } = useLoaderData()
  const [params] = useSearchParams()
  const active = params.get('action') ?? ''

  const filterLink = (a) => {
    const p = new URLSearchParams(params)
    a ? p.set('action', a) : p.delete('action')
    p.delete('page')
    return `?${p}`
  }

  // Group consecutive entries under a date heading.
  const groups = []
  for (const row of rows) {
    const day = dayFormat.format(new Date(row.createdAt))
    if (!groups.length || groups.at(-1).day !== day) groups.push({ day, items: [] })
    groups.at(-1).items.push(row)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Activity log</h1>
        <p className="mt-1 text-sm text-gray-500">Every change made to the catalogue, most recent first.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link to={filterLink('')}
          className={`rounded-lg px-3 py-1.5 text-sm ${active === '' ? 'bg-royal-blue text-white' : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
          All
        </Link>
        {actions.map(({ action, n }) => (
          <Link key={action} to={filterLink(action)}
            className={`rounded-lg px-3 py-1.5 text-sm ${active === action ? 'bg-royal-blue text-white' : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
            {ACTION_LABEL[action] ?? action} <span className="opacity-60">{n}</span>
          </Link>
        ))}
      </div>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} />

      {groups.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Nothing recorded yet. Edits will appear here as they are made.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.day} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{group.day}</h2>
          <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {group.items.map((row) => (
              <li key={row.id} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
                <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-gray-400">
                  {timeFormat.format(new Date(row.createdAt))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TONE[row.action] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                      {ACTION_LABEL[row.action] ?? row.action}
                    </span>
                    {row.entityLabel && (
                      row.entityId
                        ? <Link to={`/admin/products/${row.entityId}`} className="truncate text-sm font-medium text-tundora hover:text-royal-blue">
                            {row.entityLabel}
                          </Link>
                        : <span className="truncate text-sm font-medium text-tundora">{row.entityLabel}</span>
                    )}
                  </div>
                  {describe(row)}
                </div>
                <span className="shrink-0 pt-0.5 text-xs text-gray-400">{row.userEmail ?? 'system'}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />
    </div>
  )
}
