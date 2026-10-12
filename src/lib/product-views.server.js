import { eq, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { products } from '../db/schema.js'
import { getUser } from './auth.server.js'

/** Crawlers, link previews, monitors and scripts: not people looking at a product. */
const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|monitor|uptime|curl|wget|python|node-fetch|axios|go-http|java\//i

/**
 * Counts one visit to a product page. Not counted: admins (their own checking
 * would skew popularity), bots, link prefetches and anything but a plain GET.
 * Never awaited by the page and never throws.
 */
export async function countProductView(productId, request) {
  try {
    if (!productId || request.method !== 'GET') return
    if (NOT_A_PERSON.test(request.headers.get('user-agent') ?? '')) return
    if (/prefetch|prerender/i.test(`${request.headers.get('purpose') ?? ''} ${request.headers.get('sec-purpose') ?? ''}`)) return
    if (await getUser(request)) return
    const db = await getDb()
    await db.update(products).set({ views: sql`${products.views} + 1` }).where(eq(products.id, Number(productId)))
  } catch { /* a missed count is fine */ }
}
