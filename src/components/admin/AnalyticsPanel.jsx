import { useFetcher } from 'react-router'

/**
 * Google Analytics on the dashboard.
 *
 * Deliberately the same visual language as the Search Console panel directly
 * above it — same metric cards, same delta treatment, same refresh control.
 * The two answer different questions (who arrived vs who found you in search)
 * and sitting them side by side in one house style makes that comparison
 * readable rather than making the reader re-learn a layout halfway down.
 */

const nf = new Intl.NumberFormat('en-CA')

const fmt = {
  count: (n) => nf.format(Math.round(n ?? 0)),
  duration: (seconds) => {
    const s = Math.round(seconds ?? 0)
    if (!s) return '—'
    const m = Math.floor(s / 60)
    return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
  },
}

function since(iso) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return new Date(Date.UTC(+y, +m - 1, +d))
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function Delta({ current, previous, format = fmt.count }) {
  if (previous == null || previous === 0) {
    return <span className="text-xs text-gray-400">no prior data</span>
  }
  const change = current - previous
  const pct = (change / previous) * 100
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-gray-400">no change</span>
  return (
    <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>
      {change > 0 ? '▲' : '▼'} {format(Math.abs(change))}
      <span className="ml-1 text-gray-400">({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)</span>
    </span>
  )
}

function Metric({ label, value, hint, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-tundora">{value}</p>
      <div className="mt-1 min-h-[1rem]">{children}</div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

/** Users as the filled area, sessions as the line over it. Sessions are always
 *  the larger number, so drawing them on one shared scale keeps the
 *  relationship between them legible instead of flattening users. */
function TrendChart({ rows }) {
  if (!rows?.length) return null

  const W = 720
  const H = 140
  const PAD = 4
  const max = Math.max(...rows.map((r) => Math.max(r.sessions, r.users)), 1)
  const x = (i) => (rows.length === 1 ? W / 2 : (i / (rows.length - 1)) * (W - PAD * 2) + PAD)
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2)
  const line = (key) =>
    rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ')
  const area = `${line('users')} L${x(rows.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none"
        role="img" aria-label="Users and sessions over the reporting period">
        <path d={area} fill="rgb(219 234 254)" />
        <path d={line('users')} fill="none" stroke="rgb(96 165 250)" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke" />
        <path d={line('sessions')} fill="none" stroke="rgb(22 163 74)" strokeWidth="2"
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-green-600" />
            Sessions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-blue-400" />
            Users <span className="text-gray-400">peak {fmt.count(max)}</span>
          </span>
        </span>
        <span className="text-gray-400">
          {prettyDate(rows[0]?.date)} – {prettyDate(rows[rows.length - 1]?.date)}
        </span>
      </div>
    </div>
  )
}

function Panel({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-tundora">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const Empty = () => <p className="px-4 py-6 text-sm text-gray-400">No data for this period.</p>

/* --------------------------------------------------------------- unset state */

function NotConfigured({ configError, serviceAccount, propertyId }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-serif text-lg font-bold text-tundora">Google Analytics</h2>

      {configError && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Setup started but not finished.</strong> {configError}
        </p>
      )}

      <p className="mt-3 text-sm text-gray-600">
        Not connected yet. This reads the figures through the Analytics Data API using the
        same service account already set up for Search Console — being a user in one does
        not make it a user in the other, so it needs adding to Analytics separately.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-gray-600 marker:text-gray-400">
        <li>
          In Google Cloud, enable <strong>Google Analytics Data API</strong> in the same
          project the service-account key came from.
        </li>
        <li>
          In Analytics → Admin → <strong>Property access management</strong>, add{' '}
          {serviceAccount
            ? <code className="rounded bg-gray-100 px-1 text-xs">{serviceAccount}</code>
            : 'the service account email'}{' '}
          as a <strong>Viewer</strong>.
        </li>
        <li>
          Put the numeric property id in{' '}
          <code className="rounded bg-gray-100 px-1 text-xs">GA4_PROPERTY_ID</code> and restart.
        </li>
      </ol>
      <p className="mt-4 text-sm text-gray-500">
        Full walkthrough in <code className="rounded bg-gray-100 px-1 text-xs">docs/search-console-setup.md</code>.
        {propertyId && <> Property currently set to <code className="rounded bg-gray-100 px-1 text-xs">{propertyId}</code>.</>}
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ panel */

export default function AnalyticsPanel({ analytics }) {
  const fetcher = useFetcher()
  const refreshing = fetcher.state !== 'idle'

  if (!analytics?.configured) {
    return (
      <NotConfigured
        configError={analytics?.error}
        serviceAccount={analytics?.serviceAccount}
        propertyId={analytics?.propertyId}
      />
    )
  }

  const { summary, trend, pages, channels } = analytics
  const cur = summary?.current
  const prev = summary?.previous
  const totalSessions = channels?.reduce((n, c) => n + c.sessions, 0) || 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-tundora">Google Analytics</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {summary
              ? <>Last {summary.windowDays} days ({prettyDate(summary.startDate)} – {prettyDate(summary.endDate)}), against the {summary.windowDays} before.</>
              : <>Property {analytics.propertyId}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Updated {since(analytics.fetchedAt)}</span>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="refresh-analytics" />
            <button type="submit" disabled={refreshing}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </fetcher.Form>
          <a href={`https://analytics.google.com/analytics/web/#/p${analytics.propertyId}/reports/intelligenthome`}
            target="_blank" rel="noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline">
            Open in Google ↗
          </a>
        </div>
      </div>

      {analytics.error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {analytics.error}
        </p>
      )}

      {analytics.empty && !analytics.error && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No figures cached yet. Press Refresh to pull the first set from Google.
        </p>
      )}

      {cur && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Users" value={fmt.count(cur.activeUsers)}>
            <Delta current={cur.activeUsers} previous={prev?.activeUsers} />
          </Metric>
          <Metric label="Sessions" value={fmt.count(cur.sessions)}>
            <Delta current={cur.sessions} previous={prev?.sessions} />
          </Metric>
          <Metric label="Page views" value={fmt.count(cur.screenPageViews)}>
            <Delta current={cur.screenPageViews} previous={prev?.screenPageViews} />
          </Metric>
          <Metric label="Avg. session" value={fmt.duration(cur.averageSessionDuration)}
            hint="Time on site per session">
            <Delta current={cur.averageSessionDuration} previous={prev?.averageSessionDuration}
              format={fmt.duration} />
          </Metric>
        </div>
      )}

      {trend?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <TrendChart rows={trend} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most viewed pages" hint="By page views over the period">
          {pages?.length ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="px-4 py-2 text-left font-medium"> </th>
                  <th className="w-16 px-2 py-2 text-right font-medium">Views</th>
                  <th className="w-16 px-4 py-2 text-right font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.path} className="border-t border-gray-50">
                    <td className="truncate px-4 py-2">
                      <a
                        href={`https://www.royalwoodshop.com${p.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {p.path}
                        {p.title && <span className="ml-2 text-xs text-gray-400">{p.title}</span>}
                      </a>
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-700">{fmt.count(p.views)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{fmt.count(p.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Panel>

        <Panel title="Where they came from" hint="Sessions by channel">
          {channels?.length ? (
            <ul className="flex flex-col">
              {channels.map((c) => {
                const share = totalSessions ? (c.sessions / totalSessions) * 100 : 0
                return (
                  <li key={c.channel} className="border-t border-gray-50 px-4 py-2.5 first:border-t-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-gray-700">{c.channel}</span>
                      <span className="shrink-0 text-sm font-medium text-gray-700">
                        {fmt.count(c.sessions)}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {share.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-blue-400"
                        style={{ width: `${Math.max(share, 1)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : <Empty />}
        </Panel>
      </div>
    </section>
  )
}
