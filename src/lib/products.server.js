import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { catalogueProducts } from '../data/catalogue'

/**
 * Every product, for the product page and its spec sheet.
 *
 * 1. Live database — the source of truth on Railway. Reading the committed
 *    products.json first meant every deploy put back an old snapshot, so
 *    admin edits and archived products reverted on the product page.
 * 2. Snapshot, only when there is no database (static prerender builds).
 */
export async function loadAllProducts() {
  try {
    const { getDb } = await import('./db.server.js')
    const { getAllProducts } = await import('../db/queries.js')
    const all = await getAllProducts(await getDb())
    if (all?.length) return all
  } catch {}
  try {
    return JSON.parse(readFileSync(resolve('src/data/products.json'), 'utf8'))
  } catch {
    return catalogueProducts
  }
}
