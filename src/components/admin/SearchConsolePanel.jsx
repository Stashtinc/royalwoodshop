import { useFetcher } from 'react-router'

/* ------------------------------------------------------------- formatting */

const nf = new Intl.NumberFormat('en-CA')

const fmt = {
  count: (n) => nf.format(Math.round(n ?? 0)),
  pct: (n) => `${((n ?? 0) * 100).toFixed(1)}%`,
  pos: (n) => (n ? n.toFixed(1) : '—'),
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

/** Trims the property prefix so the table shows /product/foo, not the whole URL. */
function shortPath(url) {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '')
  } catch {
    return url
  }
}

/* ------------------------------------------------------------ small pieces */

/** Position is the one metric where down is good, hence `lowerIsBetter`. */
function Delta({ current, previous, lowerIsBetter = false, format = fmt.count }) {
  if (previous == null || previous === 0) {
    return <span className="text-xs text-gray-400">no prior data</span>
  }
  const change = current - previous
  const pct = (change / previous) * 100
  if (Math.abs(pct) < 0.5) {
    return <span className="text-xs text-gray-400">no change</span>
  }
  const good = lowerIsBetter ? change < 0 : change > 0
  return (
    <span className={`text-xs font-medium ${good ? 'text-green-600' : 'text-red-500'}`}>
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

/**
 * Clicks and impressions over the window. Two independent scales — impressions
 * are typically 20-50x clicks, so a shared axis would flatten clicks to zero.
 * Impressions are the area, clicks the line drawn over it.
 */
function TrendChart({ rows }) {
  if (!rows?.length) return null

  const W = 720
  const H = 140
  const PAD = 4
  const maxImp = Math.max(...rows.map((r) => r.impressions), 1)
  const maxClk = Math.max(...rows.map((r) => r.clicks), 1)
  const x = (i) => (rows.length === 1 ? W / 2 : (i / (rows.length - 1)) * (W - PAD * 2) + PAD)
  const y = (v, max) => H - PAD - (v / max) * (H - PAD * 2)

  const line = (key, max) =>
    rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key], max).toFixed(1)}`).join(' ')

  const area = `${line('impressions', maxImp)} L${x(rows.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none"
        role="img" aria-label="Clicks and impressions over the reporting period">
        <path d={area} fill="rgb(219 234 254)" />
        <path d={line('impressions', maxImp)} fill="none" stroke="rgb(96 165 250)" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke" />
        <path d={line('clicks', maxClk)} fill="none" stroke="rgb(22 163 74)" strokeWidth="2"
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-green-600" />
            Clicks <span className="text-gray-400">peak {fmt.count(maxClk)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-blue-400" />
            Impressions <span className="text-gray-400">peak {fmt.count(maxImp)}</span>
          </span>
        </span>
        <span className="text-gray-400">
          {prettyDate(rows[0]?.date)} – {prettyDate(rows[rows.length - 1]?.date)}
        </span>
      </div>
    </div>
  )
}

function RankTable({ title, hint, rows, render }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-tundora">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
      {rows?.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400">
              <th className="px-4 py-2 text-left font-medium"> </th>
              <th className="px-2 py-2 text-right font-medium">Clicks</th>
              <th className="px-2 py-2 text-right font-medium">Impr.</th>
              <th className="px-4 py-2 text-right font-medium">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-gray-50">
                <td className="max-w-0 truncate px-4 py-2 text-gray-700" title={r.key}>
                  {render(r)}
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-700">{fmt.count(r.clicks)}</td>
                <td className="px-2 py-2 text-right text-gray-500">{fmt.count(r.impressions)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{fmt.pos(r.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-4 py-6 text-sm text-gray-400">No data for this period.</p>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- unset state */

function NotConfigured({ siteUrl, configError }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-serif text-lg font-bold text-tundora">Google Search Console</h2>

      {configError && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Setup started but not finished.</strong> {configError}
        </p>
      )}

      <p className="mt-3 text-sm text-gray-600">
        Not connected yet. Google does not allow the Search Console dashboard to be
        embedded, so the site reads the figures through its API instead. That needs a
        service account — a Google identity that belongs to the website rather than to
        a person, so nothing breaks when someone changes their password or leaves.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-gray-600 marker:text-gray-400">
        <li>In Google Cloud, create a project and enable the Google Search Console API.</li>
        <li>Create a service account and download its JSON key.</li>
        <li>
          In Search Console → Settings → Users and permissions, add the service
          account&rsquo;s email address as a <strong>Full</strong> user.
        </li>
        <li>
          Put the key in <code className="rounded bg-gray-100 px-1 text-xs">GSC_SERVICE_ACCOUNT_JSON</code>{' '}
          and the property in <code className="rounded bg-gray-100 px-1 text-xs">GSC_SITE_URL</code>,
          then restart.
        </li>
      </ol>
      <p className="mt-4 text-sm text-gray-500">
        Full walkthrough in <code className="rounded bg-gray-100 px-1 text-xs">docs/search-console-setup.md</code>.
        {siteUrl && <> Property currently set to <code className="rounded bg-gray-100 px-1 text-xs">{siteUrl}</code>.</>}
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ panel */

export default function SearchConsolePanel({ search }) {
  const fetcher = useFetcher()
  const refreshing = fetcher.state !== 'idle'

  if (!search?.configured) {
    return <NotConfigured siteUrl={search?.siteUrl} configError={search?.configError} />
  }

  const summary = search.reports.summary?.data
  const trend = search.reports.trend?.data
  const queries = search.reports.queries?.data
  const pages = search.reports.pages?.data
  const coverage = search.reports.coverage?.data

  // One failing report should not hide the four that worked, so errors are
  // collected and shown once above the numbers.
  const errors = [...new Set(
    Object.values(search.reports).map((r) => r?.error).filter(Boolean),
  )]

  const consoleHref =
    `https://search.google.com/search-console?resource_id=${encodeURIComponent(search.siteUrl)}`

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-tundora">Google Search Console</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {summary
              ? <>Last {summary.windowDays} days ({prettyDate(summary.range.startDate)} – {prettyDate(summary.range.endDate)}), against the {summary.windowDays} before.</>
              : <>{search.siteUrl}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Updated {since(search.fetchedAt)}</span>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="refresh-search-console" />
            <button type="submit" disabled={refreshing}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </fetcher.Form>
          <a href={consoleHref} target="_blank" rel="noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline">
            Open in Google ↗
          </a>
        </div>
      </div>

      {errors.map((message) => (
        <p key={message} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </p>
      ))}

      {search.empty && !errors.length && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No figures cached yet. Press Refresh to pull the first set from Google.
        </p>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Clicks" value={fmt.count(summary.current.clicks)}>
            <Delta current={summary.current.clicks} previous={summary.previous.clicks} />
          </Metric>
          <Metric label="Impressions" value={fmt.count(summary.current.impressions)}>
            <Delta current={summary.current.impressions} previous={summary.previous.impressions} />
          </Metric>
          <Metric label="Average CTR" value={fmt.pct(summary.current.ctr)}>
            <Delta current={summary.current.ctr} previous={summary.previous.ctr} format={fmt.pct} />
          </Metric>
          <Metric label="Average position" value={fmt.pos(summary.current.position)}
            hint="Lower is better — 1 is the top result">
            <Delta current={summary.current.position} previous={summary.previous.position}
              lowerIsBetter format={(n) => n.toFixed(1)} />
          </Metric>
        </div>
      )}

      {trend?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <TrendChart rows={trend} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RankTable title="Top search queries" hint="What people typed to find the site"
          rows={queries} render={(r) => r.key} />
        <RankTable title="Top pages" hint="Which pages Google sends people to"
          rows={pages} render={(r) => (
            <a href={r.key} target="_blank" rel="noreferrer" className="hover:underline">
              {shortPath(r.key)}
            </a>
          )} />
      </div>

      {coverage && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <p className="text-2xl font-bold text-tundora">{fmt.count(coverage.pagesInSearch)}</p>
              <p className="text-sm text-gray-600">Pages appearing in search</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-tundora">{fmt.count(coverage.pagesWithClicks)}</p>
              <p className="text-sm text-gray-600">Pages that earned a click</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Counted from pages shown at least once in the last {coverage.windowDays} days.
            Google publishes no API for the Index Coverage report, so this is not the
            same as the number indexed — a page can be indexed and never shown.
          </p>
        </div>
      )}
    </section>
  )
}
