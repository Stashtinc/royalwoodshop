import snapshot from './products.json'

/** Synchronous view of the catalogue, used by components during render.
 *  Loaders hydrate this from Postgres at build time via setCatalogue(). */
/** The committed snapshot. Loaders pass live data down as props; this is the
 *  fallback so components still render standalone (and in tests). */
const products = snapshot
export const catalogueProducts = snapshot

export const TRIM_CATEGORY = 'Trim and Mouldings'
export const DOORS_CATEGORY = 'Interior Doors'

export const CATEGORY_SLUGS = {
  'Trim and Mouldings': 'trim-mouldings',
  'Interior Doors': 'interior-doors',
  'Door Hardware': 'door-hardware',
  'Stairs & Railings': 'stair-railing',
}

/** The reverse of CATEGORY_SLUGS. The Products menu links to
 *  /products?category=<slug>, and the catalogue turns that back into a
 *  sidebar selection. */
export const CATEGORY_BY_SLUG = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([name, slug]) => [slug, name]),
)

export const getProduct = (slug) => products.find((p) => p.slug === slug) ?? null
export const productPath = (p) => `/products/${p.categorySlug}/${p.slug}/`

export const relatedTo = (p, limit = 6) =>
  products
    .filter((x) => x.slug !== p.slug && x.subcategory === p.subcategory)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)

/* ---------------------------------------------------------------- facets */

const order = ['Trim and Mouldings', 'Interior Doors', 'Door Hardware', 'Stairs & Railings']

export function categoryTree(rows = products) {
  const map = new Map()
  for (const p of rows) {
    if (!map.has(p.category)) map.set(p.category, new Set())
    map.get(p.category).add(p.subcategory)
  }
  return [...map.entries()]
    .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
    .map(([name, subs]) => ({ name, subcategories: [...subs].sort() }))
}

/** Only species that actually have products behind them. While the sheet is
 *  being completed this list grows; it is never a list of empty filters. */
export function speciesFacet(rows = products) {
  const counts = new Map()
  for (const p of rows) for (const s of p.species ?? []) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }))
}

export function availabilityFacet(rows = products) {
  const labels = { in_stock: 'In Stock', quick_ship: 'Quick Ship', special_order: 'Special Order' }
  const counts = new Map()
  for (const p of rows) if (p.availability) counts.set(p.availability, (counts.get(p.availability) ?? 0) + 1)
  return ['in_stock', 'quick_ship', 'special_order']
    .filter((k) => counts.has(k))
    .map((k) => ({ key: k, value: labels[k], count: counts.get(k) }))
}

export const flexCount = (rows = products) => rows.filter((p) => p.flexAvailable).length

export const catalogueSizeCategories = ['Under 2"', '2" – 4"', '4" – 7"', 'Over 7"', 'Made to order']

/* legacy named exports still used by components */
export const catalogueCategoryOrder = categoryTree()
export const catalogueMaterials = [...new Set(products.map((p) => p.material))]
  .filter((m) => m && m !== 'Unspecified').sort()
