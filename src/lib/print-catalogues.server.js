import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { printCatalogues, printCatalogueItems, products, productPartIds, categories } from '../db/schema.js'

const DEFAULT_TITLE = 'Product Catalogue'

/** Saved catalogues, newest change first, with how many products each holds. */
export async function listPrintCatalogues() {
  const db = await getDb()
  return db.select({
    id: printCatalogues.id,
    title: printCatalogues.title,
    showPrices: printCatalogues.showPrices,
    updatedAt: printCatalogues.updatedAt,
    productCount: sql`(select count(*)::int from print_catalogue_items i where i.catalogue_id = print_catalogues.id)`,
  }).from(printCatalogues).orderBy(desc(printCatalogues.updatedAt))
}

/** A new, empty catalogue with the default title. Returns its id. */
export async function createPrintCatalogue(createdByEmail) {
  const db = await getDb()
  const [row] = await db.insert(printCatalogues)
    .values({ createdByEmail })
    .returning({ id: printCatalogues.id })
  return row.id
}

/** Deletes a catalogue and its items. Products are not touched. */
export async function deletePrintCatalogue(id) {
  const db = await getDb()
  await db.delete(printCatalogues).where(eq(printCatalogues.id, Number(id)))
}

/** One catalogue with its items in print order, or null when it does not exist.
 *  Each item carries what the print layout needs: picture, description, specs and prices. */
export async function getPrintCatalogue(id) {
  const db = await getDb()
  const [cat] = await db.select().from(printCatalogues).where(eq(printCatalogues.id, Number(id))).limit(1)
  if (!cat) return null
  const rows = await db.select({
    itemId: printCatalogueItems.id,
    productId: products.id,
    name: products.name,
    productCode: products.productCode,
    status: products.status,
    description: products.description,
    sizeDisplay: products.sizeDisplay,
    availability: products.availability,
    leadTime: products.leadTime,
    price: products.price,
    salePrice: products.salePrice,
    category: sql`(select c.name from categories c where c.id = products.primary_category_id)`.as('category'),
    species: sql`(select string_agg(av.value, ', ' order by av.sort_order) from product_attributes pa join attribute_values av on av.id = pa.attribute_value_id join attributes a on a.id = av.attribute_id where pa.product_id = products.id and a.key = 'species')`.as('species'),
    image: sql`(select pi.storage_key from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as('image'),
    imageWidth: sql`(select pi.width from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as('imageWidth'),
  }).from(printCatalogueItems)
    .innerJoin(products, eq(products.id, printCatalogueItems.productId))
    .where(eq(printCatalogueItems.catalogueId, cat.id))
    .orderBy(asc(printCatalogueItems.sortOrder), asc(printCatalogueItems.id))

  // Per-species prices, as on the product page (Part ID rows that carry a price).
  const productIds = [...new Set(rows.map((r) => r.productId))]
  const partRows = productIds.length
    ? await db.select({ productId: productPartIds.productId, species: productPartIds.species, price: productPartIds.price, salePrice: productPartIds.salePrice })
      .from(productPartIds)
      .where(and(inArray(productPartIds.productId, productIds), sql`${productPartIds.price} is not null`))
    : []
  const pricesByProduct = new Map()
  for (const p of partRows) {
    if (!pricesByProduct.has(p.productId)) pricesByProduct.set(p.productId, [])
    pricesByProduct.get(p.productId).push({ species: p.species, price: p.price, salePrice: p.salePrice })
  }
  const items = rows.map((r) => ({ ...r, prices: pricesByProduct.get(r.productId) ?? [] }))
  return { ...cat, items }
}

/** Title and show-prices switch. An empty title falls back to the default. */
export async function updatePrintCatalogue(id, { title, showPrices }) {
  const db = await getDb()
  await db.update(printCatalogues)
    .set({ title: (title ?? '').trim() || DEFAULT_TITLE, showPrices: Boolean(showPrices), updatedAt: new Date() })
    .where(eq(printCatalogues.id, Number(id)))
}

/** Adds a product at the end of the catalogue. Adding one already there does nothing. */
export async function addProductToCatalogue(catalogueId, productId) {
  const db = await getDb()
  const cid = Number(catalogueId)
  const [{ max }] = await db.select({
    max: sql`coalesce(max(${printCatalogueItems.sortOrder}), 0)`.mapWith(Number),
  }).from(printCatalogueItems).where(eq(printCatalogueItems.catalogueId, cid))
  // Gaps of 10 leave room to reorder without renumbering everything.
  await db.insert(printCatalogueItems)
    .values({ catalogueId: cid, productId: Number(productId), sortOrder: max + 10 })
    .onConflictDoNothing()
  await touchCatalogue(cid)
}

/** Takes one product out of a catalogue. The product itself is not touched. */
export async function removeItemFromCatalogue(catalogueId, itemId) {
  const db = await getDb()
  await db.delete(printCatalogueItems).where(and(
    eq(printCatalogueItems.id, Number(itemId)),
    eq(printCatalogueItems.catalogueId, Number(catalogueId)),
  ))
  await touchCatalogue(catalogueId)
}

/** Products for the picker: not archived. An empty query lists them all, A to Z. */
export async function searchProductsForCatalogue(q, limit = 50, offset = 0, filters = {}) {
  const term = `%${String(q ?? "").trim()}%`
  const hasQuery = String(q ?? "").trim() !== ""
  const { category = "", species = "", status = "", ids = null } = filters
  const db = await getDb()
  return db.select({
    id: products.id,
    name: products.name,
    productCode: products.productCode,
    status: products.status,
    views: products.views,
    availability: products.availability,
    category: sql`(select c.name from categories c where c.id = products.primary_category_id)`.as("category"),
    species: sql`(select string_agg(av.value, ', ' order by av.sort_order) from product_attributes pa join attribute_values av on av.id = pa.attribute_value_id join attributes a on a.id = av.attribute_id where pa.product_id = products.id and a.key = 'species')`.as("species"),
    image: sql`(select pi.storage_key from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as("image"),
    imageWidth: sql`(select pi.width from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as("imageWidth"),
  }).from(products)
    .where(and(
      ne(products.status, "archived"),
      status ? eq(products.status, status) : undefined,
      ids ? inArray(products.id, ids) : undefined,
      category ? sql`(products.primary_category_id = ${Number(category)} or exists (select 1 from product_categories pc where pc.product_id = products.id and pc.category_id = ${Number(category)}))` : undefined,
      species ? sql`exists (select 1 from product_attributes pa join attribute_values av on av.id = pa.attribute_value_id join attributes a on a.id = av.attribute_id where pa.product_id = products.id and a.key = 'species' and av.value = ${species})` : undefined,
      hasQuery ? or(
        ilike(products.name, term),
        ilike(products.productCode, term),
        ilike(products.slug, term),
        sql`exists (select 1 from product_part_ids pp where pp.product_id = products.id and pp.part_id ilike ${term})`,
      ) : undefined,
    ))
    .orderBy(asc(products.name), asc(products.id))
    .limit(limit)
    .offset(offset)
}

/** Adds several products in one go. Ones already in the catalogue are skipped. */
export async function addProductsToCatalogue(catalogueId, productIds) {
  for (const productId of productIds) await addProductToCatalogue(catalogueId, productId)
}

async function touchCatalogue(id) {
  const db = await getDb()
  await db.update(printCatalogues).set({ updatedAt: new Date() }).where(eq(printCatalogues.id, Number(id)))
}

/** Saves a new print order. itemIds are in the order they should print; gaps of 10 as before. */
export async function reorderCatalogueItems(catalogueId, itemIds) {
  const db = await getDb()
  const cid = Number(catalogueId)
  const ids = itemIds.map(Number).filter(Boolean)
  await db.transaction(async (tx) => {
    for (const [i, itemId] of ids.entries()) {
      await tx.update(printCatalogueItems)
        .set({ sortOrder: (i + 1) * 10 })
        .where(and(eq(printCatalogueItems.id, itemId), eq(printCatalogueItems.catalogueId, cid)))
    }
  })
  await touchCatalogue(cid)
}

/** Categories for the picker's filter, A to Z. */
export async function listCategoryOptions() {
  const db = await getDb()
  return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name))
}

/** Cover options: title and date stamp. An empty date means the print date. */
export async function updateCover(id, { title, coverDate }) {
  const db = await getDb()
  await db.update(printCatalogues)
    .set({
      title: (title ?? '').trim() || DEFAULT_TITLE,
      coverDate: (coverDate ?? '').trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(printCatalogues.id, Number(id)))
}

/** Sets the cover background to a stored image path, or clears it with null. */
export async function setCoverBackground(id, storageKey) {
  const db = await getDb()
  await db.update(printCatalogues)
    .set({ coverImageKey: storageKey, updatedAt: new Date() })
    .where(eq(printCatalogues.id, Number(id)))
}

/** Takes products out of a catalogue by product id. The products themselves are not touched. */
export async function removeProductsFromCatalogue(catalogueId, productIds) {
  const db = await getDb()
  const ids = productIds.map(Number).filter(Boolean)
  if (ids.length) {
    await db.delete(printCatalogueItems).where(and(
      eq(printCatalogueItems.catalogueId, Number(catalogueId)),
      inArray(printCatalogueItems.productId, ids),
    ))
  }
  await touchCatalogue(catalogueId)
}

/** Products in the same shape as catalogue items, for showing ticks in the preview before they are saved. */
export async function productsForPreview(productIds) {
  const ids = productIds.map(Number).filter(Boolean)
  if (!ids.length) return []
  const db = await getDb()
  const rows = await db.select({
    productId: products.id,
    name: products.name,
    productCode: products.productCode,
    status: products.status,
    description: products.description,
    sizeDisplay: products.sizeDisplay,
    availability: products.availability,
    leadTime: products.leadTime,
    price: products.price,
    salePrice: products.salePrice,
    category: sql`(select c.name from categories c where c.id = products.primary_category_id)`.as('category'),
    species: sql`(select string_agg(av.value, ', ' order by av.sort_order) from product_attributes pa join attribute_values av on av.id = pa.attribute_value_id join attributes a on a.id = av.attribute_id where pa.product_id = products.id and a.key = 'species')`.as('species'),
    image: sql`(select pi.storage_key from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as('image'),
    imageWidth: sql`(select pi.width from product_images pi where pi.product_id = products.id order by pi.sort_order, pi.id limit 1)`.as('imageWidth'),
  }).from(products).where(inArray(products.id, ids))
  const partRows = await db.select({ productId: productPartIds.productId, species: productPartIds.species, price: productPartIds.price, salePrice: productPartIds.salePrice })
    .from(productPartIds)
    .where(and(inArray(productPartIds.productId, ids), sql`${productPartIds.price} is not null`))
  const pricesByProduct = new Map()
  for (const p of partRows) {
    if (!pricesByProduct.has(p.productId)) pricesByProduct.set(p.productId, [])
    pricesByProduct.get(p.productId).push({ species: p.species, price: p.price, salePrice: p.salePrice })
  }
  return rows.map((r) => ({
    ...r,
    itemId: `p${r.productId}`,
    id: `p${r.productId}`,
    prices: pricesByProduct.get(r.productId) ?? [],
  }))
}
