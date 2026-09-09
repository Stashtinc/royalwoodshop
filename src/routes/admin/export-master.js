import { eq, asc, and, inArray, isNotNull } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import {
  products, categories, productCategories,
  attributes, attributeValues, productAttributes,
} from '../../db/schema.js'
import { SPECIES } from '../../lib/catalogue-constants.js'

const AVAIL_TICK = { in_stock: 'S', quick_ship: 'QS', made_to_order: 'MO' }
const tick = (v) => AVAIL_TICK[v] ?? ''

// Column order exactly as the master workbook: Flex sits between PVC and Steel.
const SPECIES_BEFORE_FLEX = SPECIES.slice(0, SPECIES.indexOf('Steel'))  // up to and including PVC
const SPECIES_AFTER_FLEX = SPECIES.slice(SPECIES.indexOf('Steel'))       // Steel, Plastic

const HEADERS = [
  'image name', 'Code', 'Product\n Name', '\n Category', 'type\nsub-cat',
  'Size', 'Description', 'Availability', 'Price',
  'uom\n (Lft, Ea, SqFt, Kit, Pc)',
  ...SPECIES_BEFORE_FLEX, 'Flex', ...SPECIES_AFTER_FLEX, 'Other',
]

export async function loader({ request }) {
  await requireUser(request)

  const db = await getDb()

  // Products with their primary category
  const rows = await db
    .select({
      id: products.id,
      productCode: products.productCode,
      name: products.name,
      description: products.description,
      sizeDisplay: products.sizeDisplay,
      availability: products.availability,
      price: products.price,
      uom: products.uom,
      flexAvailable: products.flexAvailable,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .orderBy(asc(categories.name), asc(products.productCode), asc(products.name))

  if (!rows.length) {
    return new Response('No products found.', { status: 404 })
  }

  const ids = rows.map((r) => r.id)

  // Sub-categories (linked categories that have a parent)
  const subRows = await db
    .select({ productId: productCategories.productId, subName: categories.name })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(isNotNull(categories.parentId), inArray(productCategories.productId, ids)))

  const subsByProduct = new Map()
  for (const { productId, subName } of subRows) {
    if (!subsByProduct.has(productId)) subsByProduct.set(productId, [])
    subsByProduct.get(productId).push(subName)
  }

  // Per-species availability
  const speciesRows = await db
    .select({
      productId: productAttributes.productId,
      speciesName: attributeValues.value,
      availability: productAttributes.availability,
    })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .innerJoin(attributes, eq(attributes.id, attributeValues.attributeId))
    .where(and(eq(attributes.key, 'species'), inArray(productAttributes.productId, ids)))

  const speciesByProduct = new Map()
  for (const { productId, speciesName, availability } of speciesRows) {
    if (!speciesByProduct.has(productId)) speciesByProduct.set(productId, new Map())
    speciesByProduct.get(productId).set(speciesName, availability)
  }

  // Build rows
  const data = rows.map((p) => {
    const subs = subsByProduct.get(p.id) ?? []
    const sp = speciesByProduct.get(p.id) ?? new Map()
    return [
      '',                              // image name — not stored in DB
      p.productCode ?? '',
      p.name ?? '',
      p.categoryName ?? '',
      subs.join('|'),
      p.sizeDisplay ?? '',
      p.description ?? '',
      tick(p.availability),
      p.price ?? '',
      p.uom ?? '',
      ...SPECIES_BEFORE_FLEX.map((s) => tick(sp.get(s))),
      p.flexAvailable ? 'X' : '',     // Flex column
      ...SPECIES_AFTER_FLEX.map((s) => tick(sp.get(s))),
      '',                              // Other — free-text on the sheet, not stored
    ]
  })

  const XLSX = (await import('xlsx')).default
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data])

  // Freeze the header row so Brad can scroll without losing the column names
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Master Product List')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  const date = new Date().toISOString().slice(0, 10)

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="RoyalWoodShop_Master_${date}.xlsx"`,
    },
  })
}
