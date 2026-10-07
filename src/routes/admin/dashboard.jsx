import { Link, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { dashboardStats, ensureSpecies } from '../../lib/admin-queries.server'
import { getSearchConsole, refresh as refreshSearchConsole } from '../../lib/search-console.server'
import { getAnalytics, refresh as refreshAnalytics } from '../../lib/analytics.server'
import SearchConsolePanel from '../../components/admin/SearchConsolePanel'
import AnalyticsPanel from '../../components/admin/AnalyticsPanel'
import { INDEXING_ENABLED } from '../../seo'
import { missingPartIds } from '../../lib/part-ids.server'

export async function loader({ request }) {
  await requireUser(request)
  await ensureSpecies()

  const [stats, search, analytics, missing] = await Promise.all([
    dashboardStats(), getSearchConsole(), getAnalytics(), missingPartIds().catch(() => ({ items: [] })),
  ])

  // Top up in the background when the cache has gone stale. Deliberately not
  // awaited — the dashboard must not wait on Google to render.
  if (search.configured && (search.stale || search.empty)) {
    refreshSearchConsole().catch(() => {})
  }
  if (analytics.configured && (analytics.stale || analytics.empty)) {
    refreshAnalytics().catch(() => {})
  }

  return { stats, search, analytics, missing }
}

export async function action({ request }) {
  await requireUser(request)
  const form = await request.formData()
  const intent = form.get('intent')
  // Awaited here, unlike the loader: the user pressed Refresh and is waiting
  // for new numbers, so returning before they land would be a lie.
  if (intent === 'refresh-search-console') await refreshSearchConsole({ force: true })
  if (intent === 'refresh-analytics') await refreshAnalytics({ force: true })
  return { ok: true }
}

function Card({ label, value, tone = 'default', to, hint }) {
  const tones = {
    default: 'border-gray-200 bg-white',
    warn: 'border-amber-300 bg-amber-50',
    good: 'border-green-300 bg-green-50',
  }
  const body = (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className="text-3xl font-bold text-tundora">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
  return to ? <Link to={to} className="block rounded-2xl transition-shadow hover:shadow-lg">{body}</Link> : body
}

export default function Dashboard() {
  const { stats, search, analytics, missing } = useLoaderData()
  return (
    <div className="flex flex-col gap-8">
      {!INDEXING_ENABLED && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="10" cy="10" r="7.5" /><path d="M10 6.5v4.5" />
            <circle cx="10" cy="13.6" r="0.4" fill="currentColor" stroke="none" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-900">Hidden from search engines</p>
            <p className="mt-0.5 text-sm text-amber-800">
              This site is set to noindex, so Google will not list it. That is deliberate while it
              is on a temporary address. Set <code className="rounded bg-amber-100 px-1 text-xs">VITE_SEARCH_INDEXING=on</code>{' '}
              once it is on the final domain — nothing will rank until you do.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Catalogue</h1>
        <p className="mt-1 text-sm text-gray-500">
          {stats.published} of {stats.total} products published
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Products" value={stats.total} to="/admin/products" />
        <Card label="Awaiting species" value={stats.noSpecies} tone={stats.noSpecies ? 'warn' : 'good'}
          to="/admin/products?missing=species" hint="Species filter stays hidden until this is 0" />
        <Card label="Awaiting availability" value={stats.noAvailability} tone={stats.noAvailability ? 'warn' : 'good'}
          to="/admin/products?missing=availability" hint="In stock / quick ship / made-to-order" />
        <Card label="No description" value={stats.noDescription} tone={stats.noDescription ? 'warn' : 'good'}
          to="/admin/products?missing=description" hint="Blank pages cannot rank" />
      </div>

      {missing.items.length > 0 && (
        <details className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50">
          <summary className="cursor-pointer px-5 py-4">
            <span className="text-lg font-bold text-tundora">{missing.items.length}</span>
            <span className="ml-2 text-sm font-medium text-gray-800">
              Part ID{missing.items.length === 1 ? '' : 's'} missing from the site
            </span>
            <span className="ml-2 text-xs text-gray-600">
              — named in {missing.from} ({new Date(missing.at).toLocaleDateString('en-CA')}) but no product has {missing.items.length === 1 ? 'it' : 'them'}.
              Add them in the Master, then import again.
            </span>
          </summary>
          <ul className="max-h-72 overflow-y-auto border-t border-amber-200 bg-white px-5 py-2 font-mono text-xs text-gray-700">
            {missing.items.map((m) => (
              <li key={m.partId} className="py-0.5">
                {m.partId}
                {m.price && <span className="text-gray-500"> · ${Number(m.price).toFixed(2)}</span>}
                {m.name && <span className="font-sans text-gray-500"> · {m.name}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <SearchConsolePanel search={search} />

      <AnalyticsPanel analytics={analytics} />
    </div>
  )
}
