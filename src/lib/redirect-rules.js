import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'

/**
 * The redirect map from the old WordPress site, in one place.
 *
 * Read by the server, which answers old addresses (lib/redirects.server.js),
 * and by scripts/post-build.mjs, which writes the same rules into Netlify's
 * _redirects file.
 */

/** Page-level redirects, mapped by hand (audit spec §3.2). They win over the
 *  CSV when both name the same address. */
export const PAGE_REDIRECTS = [
  ['/trim-doors-catalogue', '/products'],
  ['/mouldings', '/products/trim-mouldings'],
  ['/interior-doors', '/products/interior-doors'],
  ['/doors', '/products/interior-doors'],
  ['/door-hardware', '/products/door-hardware'],
  ['/staircase-parts-accessories', '/products/stair-railing'],
  ['/products-new', '/products'],
  ['/upcp_product', '/products'],
]

/** The form an address is matched in: decoded, lower case, no trailing
 *  slash. WordPress wrote /Mouldings/product/x/ and /mouldings/product/x
 *  interchangeably, and links in the wild use both. */
export function redirectKey(path) {
  let p = String(path ?? '')
  try { p = decodeURI(p) } catch { /* keep it as sent */ }
  return p.toLowerCase().replace(/\/+$/, '') || '/'
}

/**
 * Every rule: the hand-mapped pages, then the product redirects in
 * data/redirects.csv across the old site's four URL patterns.
 *
 * Each is { from, to, status, source }. `from` and `to` have no trailing
 * slash; `source` is the address exactly as the CSV spells it, which is also
 * how scripts/import-redirects.mjs stored it in the redirects table.
 */
export function legacyRedirects(file = 'data/redirects.csv') {
  const rows = parse(readFileSync(file, 'utf8'), {
    columns: true, skip_empty_lines: true, trim: true, bom: true,
  })
  const rules = PAGE_REDIRECTS.map(([from, to]) => ({ from, to, status: 301, source: from }))
  for (const r of rows) {
    const from = r.from_path.replace(/\/$/, '').replace(/ /g, '%20')
    const to = r.to_path.replace(/\/$/, '')
    if (!from || from === to) continue
    rules.push({ from, to, status: Number(r.status_code) || 301, source: r.from_path.trim() })
  }
  return rules
}
