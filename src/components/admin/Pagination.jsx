import { Link, useSearchParams } from 'react-router'

/**
 * Numbered pagination that keeps the current search and filter.
 *
 * Shows the first and last page always, plus a window around the current one,
 * so 22 pages fits on a line without becoming a wall of numbers.
 */
function pageWindow(page, pages, span = 1) {
  const out = new Set([1, pages])
  for (let p = page - span; p <= page + span; p++) if (p >= 1 && p <= pages) out.add(p)
  const sorted = [...out].sort((a, b) => a - b)

  const withGaps = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) withGaps.push('gap')
    withGaps.push(p)
    prev = p
  }
  return withGaps
}

const PER_PAGE = [25, 50, 100]

export default function Pagination({ page, pages, total, perPage, compact = false }) {
  const [params] = useSearchParams()
  if (total === 0) return null

  const link = (n) => {
    const p = new URLSearchParams(params)
    p.set('page', String(n))
    return `?${p}`
  }
  const perPageLink = (n) => {
    const p = new URLSearchParams(params)
    p.set('perPage', String(n))
    p.delete('page')
    return `?${p}`
  }

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const box = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm'
  const idle = `${box} border border-gray-300 bg-white text-gray-700 hover:border-gray-400`
  const off = `${box} border border-gray-200 bg-white text-gray-300 cursor-default`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        {page > 1
          ? <Link to={link(page - 1)} className={idle} aria-label="Previous page">‹</Link>
          : <span className={off} aria-hidden="true">‹</span>}

        {pages > 1 && pageWindow(page, pages).map((p, i) =>
          p === 'gap'
            ? <span key={`gap-${i}`} className="px-1 text-sm text-gray-400">…</span>
            : p === page
              ? <span key={p} aria-current="page"
                  className={`${box} bg-royal-blue font-medium text-white`}>{p}</span>
              : <Link key={p} to={link(p)} className={idle}>{p}</Link>,
        )}

        {page < pages
          ? <Link to={link(page + 1)} className={idle} aria-label="Next page">›</Link>
          : <span className={off} aria-hidden="true">›</span>}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>Per page</span>
          {PER_PAGE.map((n) => (
            n === perPage
              ? <span key={n} className={`${box} bg-gray-200 font-medium text-gray-800`}>{n}</span>
              : <Link key={n} to={perPageLink(n)} className={idle}>{n}</Link>
          ))}
        </div>
      )}
    </div>
  )
}
