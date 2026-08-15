import { Link, useLoaderData, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listActivity, listActions, counts, pruneDetail } from '../../lib/activity.server'
import Pagination from '../../components/admin/Pagination'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const allowed = [25, 50, 100]
  const requested = Number(url.searchParams.get('perPage') ?? 50)
  const level = url.searchParams.get('level') === 'all' ? 'all' : 'milestone'

  // Detail older than 90 days is removed here rather than by a scheduler, so
  // there is nothing extra to run or keep alive.
  await pruneDetail(90)

  const [activity, actions, totals] = await Promise.all([
    listActivity({
      page: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
      perPage: allowed.includes(requested) ? requested : 50,
      level,
      action: url.searchParams.get('action') ?? '',
    }),
    listActions(level),
    counts(),
  ])
  return { ...activity, actions, level, totals }
}

const ACTION_LABEL = {
  'setup.schema': 'Database created',
  'setup.catalogue': 'Catalogue imported',
  'setup.redirects': 'Redirects loaded',
  'import.species': 'Species sheet imported',
  'site.published': 'Site published',
  'product.status': 'Visibility changed',
  'product.created': 'Product added',
  'product.updated': 'Product edited',
  'image.added': 'Images added',
  'image.updated': 'Image details changed',
  'image.deleted': 'Image removed',
  'image.reordered': 'Images reordered',
  'auth.login': 'Signed in',
}

const TONE = {
  'setup.schema': 'bg-slate-100 text-slate-700 ring-slate-300',
  'setup.catalogue': 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'setup.redirects': 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'import.species': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'site.published': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'product.status': 'bg-amber-50 text-amber-900 ring-amber-200',
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
  // A rolled-up run of edits.
  if (row.group) {
    const first = row.group.at(-1), last = row.group[0]
    const fields = [...new Set(row.group.flatMap((g) => (g.details?.changed ?? []).map((c) => c.field)))]
    return (
      <p className="mt-1 text-xs text-gray-600">
        {row.group.length} products, {timeFormat.format(new Date(first.createdAt))}–
        {timeFormat.format(new Date(last.createdAt))}
        {fields.length > 0 && <> · {fields.slice(0, 6).join(', ')}</>}
      </p>
    )
  }

  const d = row.details
  if (!d) return null
  if (row.action === 'import.species') {
    return (
      <p className="mt-1 text-xs text-gray-600">
        {d.updated} products updated · {d.species} gained species
        {d.availability ? ` · ${d.availability} gained availability` : ''}
        {d.unmatched ? ` · ${d.unmatched} codes not found` : ''}
      </p>
    )
  }
  if (row.action === 'setup.catalogue') return <p className="mt-1 text-xs text-gray-600">{d.products} products</p>
  if (row.action === 'setup.redirects') return <p className="mt-1 text-xs text-gray-600">{d.redirects} redirects</p>
  if (row.action === 'product.status') return <p className="mt-1 text-xs text-gray-600">{d.from} → {d.to}</p>
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
  const { rows, total, page, pages, perPage, actions, level, totals } = useLoaderData()
  const [params] = useSearchParams()
  const active = params.get('action') ?? ''

  const levelLink = (l) => {
    const p = new URLSearchParams(params)
    l === 'milestone' ? p.delete('level') : p.set('level', l)
    p.delete('page'); p.delete('action')
    return `?${p}`
  }
  const tab = (isOn) =>
    `-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors ${
      isOn
        ? 'border-royal-blue font-medium text-tundora'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`

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
        <p className="mt-1 text-sm text-gray-500">
          {level === 'milestone'
            ? 'Significant changes — imports, publishes, and anything that changed what customers see.'
            : 'Everything, including individual edits, image changes and sign-ins.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-gray-200">
        <Link to={levelLink('milestone')} className={tab(level === 'milestone')}>
          Milestones <span className="ml-0.5 text-gray-400">{totals.milestones}</span>
        </Link>
        <Link to={levelLink('all')} className={tab(level === 'all')}>
          Everything <span className="ml-0.5 text-gray-400">{totals.milestones + totals.detail}</span>
        </Link>

        <details className="group relative -mb-px pb-2.5">
          <summary
            aria-label="What counts as a milestone?"
            className="flex cursor-pointer list-none items-center text-gray-400 hover:text-gray-600 [&::-webkit-details-marker]:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"
              fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9v4.5" /><circle cx="10" cy="6.6" r="0.35" fill="currentColor" stroke="none" />
            </svg>
          </summary>
          <div className="absolute top-8 left-0 z-20 w-80 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-lg">
            <p className="font-medium text-tundora">What counts as a milestone?</p>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-gray-600">
              <li>Anything that changed <strong>many products at once</strong> — importing the species sheet, publishing the site.</li>
              <li>Anything that changed <strong>what customers see</strong> — a product being published, hidden or archived.</li>
              <li>Setup events, such as the catalogue and redirects first being loaded.</li>
            </ul>
            <p className="mt-2.5 text-xs leading-relaxed text-gray-500">
              Everything else — editing one field, changing an image, signing in — is recorded
              under <strong>Everything</strong>, and kept for 90 days. Runs of edits by one person
              are grouped into a single line.
            </p>
          </div>
        </details>

        {level === 'all' && (
          <span className="pb-2.5 text-xs text-gray-400">Detailed entries are kept for 90 days</span>
        )}
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
          <p className="text-sm text-gray-500">
            {level === 'milestone'
              ? 'No milestones yet. Imports and publishes will appear here.'
              : 'Nothing recorded yet. Edits will appear here as they are made.'}
          </p>
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
                    {row.group && (
                      <span className="rounded bg-gray-900/5 px-1.5 py-0.5 text-[11px] text-gray-600">
                        ×{row.group.length}
                      </span>
                    )}
                    {row.entityLabel && !row.group && (
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
