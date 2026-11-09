import { getDb } from './db.server.js'
import { getAllProducts } from '../db/queries.js'
import { productPartIds, products } from '../db/schema.js'
import { eq } from 'drizzle-orm'

/**
 * Site search for products, read from the live database so new and edited
 * products are findable at once (the static search index is only as new as
 * the last build).
 *
 * Every word typed must appear somewhere in the product: its code, name,
 * slug, Part IDs, category, sub-category, species, size, description or SEO
 * text. Matches on the code and name rank first.
 */

const TTL_MS = 60_000
let cache = null

// Field order is also the ranking: an earlier field is a better match.
const FIELD_ORDER = ['code', 'name', 'slug', 'partIds', 'category', 'sub', 'species', 'size', 'description', 'seo']

async function searchableProducts() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items
  const db = await getDb()
  const [all, partRows] = await Promise.all([
    getAllProducts(db),
    db.select({ productId: productPartIds.productId, partId: productPartIds.partId })
      .from(productPartIds)
      .innerJoin(products, eq(products.id, productPartIds.productId))
      .where(eq(products.status, 'published')),
  ])

  const partsBy = new Map()
  for (const row of partRows) {
    if (!row.partId) continue
    if (!partsBy.has(row.productId)) partsBy.set(row.productId, [])
    partsBy.get(row.productId).push(row.partId)
  }

  const items = all.map((p) => {
    const placements = Array.isArray(p.placements) ? p.placements : []
    const raw = {
      code: p.productCode ?? '',
      name: p.name ?? '',
      slug: p.slug ?? '',
      partIds: (partsBy.get(p.id) ?? []).join(' '),
      category: [p.categoryName, ...(p.categoryNames ?? [])].filter(Boolean).join(' '),
      sub: placements.map((x) => `${x.category ?? ''} ${x.sub ?? ''}`).join(' '),
      species: (p.species ?? []).join(' '),
      size: p.sizeDisplay ?? '',
      description: p.description ?? '',
      seo: `${p.seoTitle ?? ''} ${p.seoDescription ?? ''}`,
    }
    const fields = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v).toLowerCase()]))
    return { product: p, fields }
  })

  cache = { at: Date.now(), items }
  return items
}

/** Products matching every word of `query`, best matches first, as search results. */
export async function searchProducts(query, limit = 8) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const items = await searchableProducts()
  const hits = []
  for (const { product, fields } of items) {
    let score = 0
    let every = true
    for (const word of words) {
      const at = FIELD_ORDER.findIndex((key) => fields[key].includes(word))
      if (at === -1) { every = false; break }
      score += at
    }
    if (every) hits.push({ product, score })
  }

  hits.sort((a, b) => a.score - b.score || String(a.product.productCode).localeCompare(String(b.product.productCode)))
  return hits.slice(0, limit).map(({ product }) => ({
    label: product.name,
    code: product.productCode,
    path: product.productCode ? `/products?code=${encodeURIComponent(product.productCode)}` : '/products',
    group: 'Products',
  }))
}
