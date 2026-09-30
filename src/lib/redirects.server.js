import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { redirects, notFoundLog } from '../db/schema.js'
import { legacyRedirects, redirectKey } from './redirect-rules.js'

/**
 * Old addresses, answered.
 *
 * Only consulted for a request that would otherwise be a 404 (see
 * entry.server.jsx), so a page that exists is never redirected and a normal
 * page view costs nothing. The rules are data/redirects.csv plus the
 * hand-mapped pages (lib/redirect-rules.js), and any row in the redirects
 * table, which wins, so a redirect can be added in the database without a
 * deploy. Each redirect followed counts a hit on its row; every 404 that
 * matches nothing is recorded in not_found_log, which is how gaps in the map
 * show up after launch.
 */

const REFRESH_MS = 5 * 60_000
let cache = null

async function load() {
  if (cache && Date.now() - cache.at < REFRESH_MS) return cache

  const rules = new Map()
  for (const rule of legacyRedirects()) {
    const key = redirectKey(rule.from)
    if (!rules.has(key)) rules.set(key, rule)
  }

  let products = null
  try {
    const db = await getDb()
    for (const row of await db.select().from(redirects)) {
      const to = row.toPath.length > 1 ? row.toPath.replace(/\/+$/, '') : row.toPath
      rules.set(redirectKey(row.fromPath), { from: row.fromPath, to, status: row.statusCode, source: row.fromPath })
    }
    const { getAllProducts } = await import('../db/queries.js')
    products = await getAllProducts(db)
  } catch (e) {
    console.error('[redirects] database unavailable, using the CSV and snapshot:', e.message)
  }
  if (!products?.length) {
    try { products = JSON.parse(readFileSync(resolve('src/data/products.json'), 'utf8')) } catch { products = [] }
  }

  cache = {
    at: Date.now(),
    rules,
    bySlug: new Map(products.map((p) => [p.slug, p])),
    categories: new Set(products.map((p) => p.categorySlug)),
  }
  return cache
}

/**
 * Where a redirect lands today. A product target is checked against the live
 * catalogue: one that moved category goes straight to its current address,
 * and one no longer sold (a third of the old site's products) goes to its
 * category, or the catalogue, rather than on to another 404.
 */
function landing(to, { bySlug, categories }) {
  const m = to.match(/^\/products\/([^/?#]+)\/([^/?#]+)$/)
  if (!m) return to
  const product = bySlug.get(m[2])
  if (product) return `/products/${product.categorySlug}/${product.slug}`
  return categories.has(m[1]) ? `/products/${m[1]}` : '/products'
}

/** A redirect Response for an old address, or null if it is not one. */
export async function redirectFor(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const url = new URL(request.url)
  const known = await load()
  const rule = known.rules.get(redirectKey(url.pathname))
  if (!rule) return null

  const to = landing(rule.to, known)
  if (redirectKey(to) === redirectKey(url.pathname)) return null
  countHit(rule)

  const external = /^https?:\/\//i.test(to)
  return new Response(null, {
    status: [301, 302, 307, 308].includes(rule.status) ? rule.status : 301,
    headers: { Location: external ? to : to + url.search, 'Cache-Control': 'public, max-age=3600' },
  })
}

/** Counts a followed redirect on its row, adding the row if the rule came
 *  from the CSV and was never imported. Never throws. */
async function countHit(rule) {
  try {
    const db = await getDb()
    await db.insert(redirects)
      .values({ fromPath: rule.source.slice(0, 500), toPath: rule.to.slice(0, 500), statusCode: rule.status, hits: 1, lastHitAt: new Date() })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { hits: sql`${redirects.hits} + 1`, lastHitAt: new Date() } })
  } catch (e) {
    console.error('[redirects] could not count a hit:', e.message)
  }
}

/** Records a 404 that no redirect covers. Never throws. */
export async function recordNotFound(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return
  try {
    const path = new URL(request.url).pathname.slice(0, 500)
    const referrer = request.headers.get('referer')?.slice(0, 500) || null
    const db = await getDb()
    await db.insert(notFoundLog)
      .values({ path, referrer, hits: 1, lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: notFoundLog.path,
        set: { hits: sql`${notFoundLog.hits} + 1`, lastSeenAt: new Date(), ...(referrer ? { referrer } : {}) },
      })
  } catch (e) {
    console.error('[redirects] could not record a 404:', e.message)
  }
}
