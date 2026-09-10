import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, categories, productCategories, attributes, attributeValues, productAttributes, productImages,
} from '../db/schema.js'

const NAV_CATS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../data/navCategories.json')

import { SPECIES, AVAILABILITY } from './catalogue-constants.js'
export { SPECIES, AVAILABILITY }

const speciesSubquery = sql`coalesce(
  (select array_agg(av.value order by av.sort_order)
   from product_attributes pa
   join attribute_values av on av.id = pa.attribute_value_id
   join attributes a on a.id = av.attribute_id and a.key = 'species'
   where pa.product_id = products.id), '{}')`

export async function listCategories() {
  const db = await getDb()
  return db.select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(sql`${categories.parentId} is null`)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
}

/** Full category tree for the picker UI — top-level categories with their subs. */
export async function listCategoriesWithSubs() {
  const db = await getDb()
  const all = await db.select({
    id: categories.id, name: categories.name, slug: categories.slug,
    parentId: categories.parentId, sortOrder: categories.sortOrder,
  }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))

  const subsByParent = new Map()
  for (const c of all.filter((c) => c.parentId)) {
    if (!subsByParent.has(c.parentId)) subsByParent.set(c.parentId, [])
    subsByParent.get(c.parentId).push(c)
  }
  return all
    .filter((c) => !c.parentId)
    .map((t) => ({ ...t, subcategories: subsByParent.get(t.id) ?? [] }))
}

/** Category IDs currently linked to a product (both top-level and sub). */
export async function listProductCategories(productId) {
  const db = await getDb()
  const rows = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, Number(productId)))
  return rows.map((r) => r.categoryId)
}

/** Replaces the product's category links and primary category. */
export async function saveProductCategories(productId, { primaryCategoryId, categoryIds }) {
  const db = await getDb()
  await db.update(products)
    .set({ primaryCategoryId: primaryCategoryId ? Number(primaryCategoryId) : null, updatedAt: new Date() })
    .where(eq(products.id, Number(productId)))

  await db.delete(productCategories).where(eq(productCategories.productId, Number(productId)))
  for (const catId of categoryIds) {
    await db.insert(productCategories)
      .values({ productId: Number(productId), categoryId: Number(catId) })
      .onConflictDoNothing()
  }
}

export async function listProducts({ q = '', page = 1, perPage = 25, missing = '', category = '', species = '', availability = '', sortBy = 'code', sortDir = 'asc' } = {}) {
  const db = await getDb()
  const where = []
  if (q.trim()) {
    where.push(or(
      ilike(products.name, `%${q.trim()}%`),
      ilike(products.productCode, `%${q.trim()}%`),
      ilike(products.slug, `%${q.trim()}%`),
    ))
  }
  if (missing === 'species') where.push(sql`${speciesSubquery} = '{}'`)
  if (missing === 'availability') where.push(sql`${products.availability} is null`)
  if (missing === 'description') where.push(sql`(${products.description} is null or ${products.description} = '')`)
  if (category) where.push(ilike(categories.name, category))
  if (species) where.push(sql`${speciesSubquery}::text[] @> array[${species}]::text[]`)
  if (availability) where.push(eq(products.availability, availability))

  const clause = where.length ? and(...where) : undefined
  const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(products).where(clause)

  const rows = await db.select({
    id: products.id,
    slug: products.slug,
    productCode: products.productCode,
    name: products.name,
    availability: products.availability,
    flexAvailable: products.flexAvailable,
    status: products.status,
    sizeDisplay: products.sizeDisplay,
    category: categories.name,
    species: speciesSubquery.as('species'),
    image: sql`(select pi.storage_key from product_images pi
                where pi.product_id = products.id
                order by pi.sort_order, pi.id limit 1)`.as('image'),
    imageWidth: sql`(select pi.width from product_images pi
                where pi.product_id = products.id
                order by pi.sort_order, pi.id limit 1)`.as('imageWidth'),
    imageCount: sql`(select count(*)::int from product_images pi
                     where pi.product_id = products.id)`.as('imageCount'),
  })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(clause)
    .orderBy(...(() => {
      const d = sortDir === 'desc' ? desc : asc
      const cols = {
        code: [d(products.productCode), asc(products.name)],
        name: [d(products.name)],
        category: [d(categories.name), asc(products.productCode)],
        availability: [d(products.availability), asc(products.productCode)],
        id: [d(products.id)],
      }
      return cols[sortBy] ?? [asc(products.productCode), asc(products.name)]
    })())
    .limit(perPage).offset((page - 1) * perPage)

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)), sortBy, sortDir }
}

export async function getProduct(id) {
  const db = await getDb()
  const [row] = await db.select({
    id: products.id, slug: products.slug, productCode: products.productCode,
    name: products.name, description: products.description,
    sizeDisplay: products.sizeDisplay, thicknessIn: products.thicknessIn,
    widthIn: products.widthIn, availability: products.availability,
    leadTime: products.leadTime, flexAvailable: products.flexAvailable,
    price: products.price, salePrice: products.salePrice,
    status: products.status, seoTitle: products.seoTitle,
    seoDescription: products.seoDescription,
    primaryCategoryId: products.primaryCategoryId,
    categorySlug: categories.slug,
    species: speciesSubquery.as('species'),
  }).from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(eq(products.id, Number(id))).limit(1)
  if (!row) return null

  // Per-species availability: { 'Poplar': 'in_stock', 'White Oak': 'quick_ship', ... }
  const speciesAvailRows = await db
    .select({ name: attributeValues.value, availability: productAttributes.availability })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .innerJoin(attributes, eq(attributes.id, attributeValues.attributeId))
    .where(and(eq(productAttributes.productId, Number(id)), eq(attributes.key, 'species')))
  const speciesAvail = Object.fromEntries(speciesAvailRows.map((r) => [r.name, r.availability]))

  // Surface any non-standard species as the "Other" rows array
  const knownSet = new Set(SPECIES)
  const otherSpecies = speciesAvailRows
    .filter((r) => !knownSet.has(r.name))
    .map((r) => ({ name: r.name, avail: r.availability }))

  return { ...row, species: Array.isArray(row.species) ? row.species : [], speciesAvail, otherSpecies }
}

const LABELS = {
  name: 'name', productCode: 'product code', description: 'description',
  sizeDisplay: 'size', thicknessIn: 'thickness', widthIn: 'width',
  availability: 'availability', leadTime: 'lead time', flexAvailable: 'flex',
  price: 'price', salePrice: 'sale price',
  status: 'status', seoTitle: 'page title', seoDescription: 'meta description',
  species: 'species',
}

/** Compares the incoming form against what is stored, so the log records what
 *  changed rather than only that something did. */
export function diffProduct(before, data) {
  const changed = []
  for (const [key, label] of Object.entries(LABELS)) {
    if (key === 'species') {
      const a = [...(before.species ?? [])].sort().join('|')
      const b = [...(data.species ?? [])].sort().join('|')
      if (a !== b) changed.push({ field: label, from: a || '—', to: b || '—' })
      continue
    }
    const a = before[key] ?? ''
    const b = data[key] ?? ''
    const norm = (v) => (typeof v === 'boolean' ? String(v) : String(v ?? '').trim())
    if (norm(a) !== norm(b)) {
      changed.push({ field: label, from: norm(a) || '—', to: norm(b) || '—' })
    }
  }
  return changed
}

export async function createProduct(data) {
  const db = await getDb()
  const slug = data.productCode
    ? data.productCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)

  const primaryCategoryId = data.primaryCategoryId ? Number(data.primaryCategoryId) : null

  const [row] = await db.insert(products).values({
    name: data.name,
    slug,
    productCode: data.productCode || null,
    description: data.description || null,
    sizeDisplay: data.sizeDisplay || null,
    thicknessIn: data.thicknessIn || null,
    widthIn: data.widthIn || null,
    availability: data.availability || null,
    leadTime: data.leadTime || null,
    flexAvailable: !!data.flexAvailable,
    price: data.price || null,
    salePrice: data.salePrice || null,
    status: data.status ?? 'draft',
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    primaryCategoryId,
  }).returning({ id: products.id })

  const categoryIds = (data.categoryIds ?? []).filter(Boolean)
  for (const catId of categoryIds) {
    await db.insert(productCategories)
      .values({ productId: row.id, categoryId: Number(catId) })
      .onConflictDoNothing()
  }

  // Species with per-species availability
  const chosen = (data.species ?? []).filter(Boolean)
  if (chosen.length) {
    const speciesAvail = data.speciesAvail ?? {}
    const [attr] = await db.insert(attributes)
      .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
      .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
      .returning({ id: attributes.id })
    const vals = await db.select({ id: attributeValues.id, value: attributeValues.value })
      .from(attributeValues)
      .where(and(eq(attributeValues.attributeId, attr.id), inArray(attributeValues.value, chosen)))
    for (const v of vals) {
      await db.insert(productAttributes)
        .values({ productId: row.id, attributeValueId: v.id, availability: speciesAvail[v.value] ?? null })
        .onConflictDoNothing()
    }
    const speciesAvailValues = chosen.map((s) => speciesAvail[s]).filter(Boolean)
    if (speciesAvailValues.length) {
      const { bestAvailability } = await import('./catalogue-constants.js')
      await db.update(products)
        .set({ availability: bestAvailability(speciesAvailValues) })
        .where(eq(products.id, row.id))
    }
  }

  return row.id
}

export async function saveProduct(id, data) {
  const db = await getDb()

  await db.update(products).set({
    name: data.name,
    productCode: data.productCode || null,
    description: data.description || null,
    sizeDisplay: data.sizeDisplay || null,
    thicknessIn: data.thicknessIn || null,
    widthIn: data.widthIn || null,
    availability: data.availability || null,
    leadTime: data.leadTime || null,
    flexAvailable: !!data.flexAvailable,
    price: data.price || null,
    salePrice: data.salePrice || null,
    status: data.status,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    updatedAt: new Date(),
  }).where(eq(products.id, Number(id)))

  // species: replace the set, preserving per-species availability
  const [attr] = await db.insert(attributes)
    .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
    .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
    .returning({ id: attributes.id })

  // speciesAvail: { 'Poplar': 'in_stock', ... } — only entries where availability is set
  const speciesAvail = data.speciesAvail ?? {}
  const chosen = data.species ?? []
  await db.delete(productAttributes).where(eq(productAttributes.productId, Number(id)))
  if (chosen.length) {
    const vals = await db.select({ id: attributeValues.id, value: attributeValues.value })
      .from(attributeValues)
      .where(and(eq(attributeValues.attributeId, attr.id), inArray(attributeValues.value, chosen)))
    for (const v of vals) {
      await db.insert(productAttributes)
        .values({ productId: Number(id), attributeValueId: v.id, availability: speciesAvail[v.value] ?? null })
        .onConflictDoNothing()
    }
  }

  // Derive the product-level availability from species if any are set, otherwise keep manual value
  const speciesAvailValues = chosen.map((s) => speciesAvail[s]).filter(Boolean)
  if (speciesAvailValues.length) {
    const { bestAvailability } = await import('./catalogue-constants.js')
    await db.update(products)
      .set({ availability: bestAvailability(speciesAvailValues) })
      .where(eq(products.id, Number(id)))
  }
}

/** Ensures every species exists as an attribute value. Idempotent. */
export async function ensureSpecies() {
  const db = await getDb()
  const [attr] = await db.insert(attributes)
    .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
    .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
    .returning({ id: attributes.id })
  for (const [i, s] of SPECIES.entries()) {
    await db.insert(attributeValues)
      .values({ attributeId: attr.id, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'), value: s, sortOrder: i })
      .onConflictDoNothing()
  }
}

/* ---------------------------------------------------------- category admin */

export async function writeNavCategoriesJson() {
  const db = await getDb()
  const navCats = await db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.inNav, true), sql`${categories.parentId} is null`))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
  try {
    writeFileSync(NAV_CATS_PATH, JSON.stringify(navCats, null, 0))
  } catch {
    // Production filesystem is read-only — sync:data handles this at build time
  }
}

export async function listCategoriesAdmin() {
  const db = await getDb()
  const all = await db.select({
    id: categories.id,
    slug: categories.slug,
    name: categories.name,
    parentId: categories.parentId,
    sortOrder: categories.sortOrder,
    inNav: categories.inNav,
    productCount: sql`(select count(distinct pc.product_id)::int from product_categories pc where pc.category_id = categories.id)`.as('product_count'),
  }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))

  const subsByParent = new Map()
  for (const c of all.filter((c) => c.parentId)) {
    if (!subsByParent.has(c.parentId)) subsByParent.set(c.parentId, [])
    subsByParent.get(c.parentId).push(c)
  }
  return all
    .filter((c) => !c.parentId)
    .map((c) => ({ ...c, subcategories: subsByParent.get(c.id) ?? [] }))
}

export async function createCategory({ name, parentId, inNav }) {
  const db = await getDb()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '')
  const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1)
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug

  const [maxRow] = await db.select({ m: sql`coalesce(max(sort_order),0)::int` })
    .from(categories).where(sql`parent_id is null`)
  const sortOrder = parentId ? 9999 : ((maxRow?.m ?? 0) + 10)

  const [row] = await db.insert(categories)
    .values({ name, slug: finalSlug, parentId: parentId || null, inNav: !!inNav, sortOrder })
    .returning({ id: categories.id })
  return row.id
}

export async function updateCategory(id, { name, inNav }) {
  const db = await getDb()
  const set = {}
  if (name !== undefined) set.name = name
  if (inNav !== undefined) set.inNav = inNav
  if (!Object.keys(set).length) return
  await db.update(categories).set({ ...set, updatedAt: new Date() }).where(eq(categories.id, Number(id)))
}

export async function deleteCategoryAdmin(id) {
  const db = await getDb()
  // Re-parent any children to null (make them top-level orphans) before deleting
  await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, Number(id)))
  // Unlink any products that use this as primary category
  await db.update(products).set({ primaryCategoryId: null }).where(eq(products.primaryCategoryId, Number(id)))
  // Remove from product_categories join table
  await db.delete(productCategories).where(eq(productCategories.categoryId, Number(id)))
  await db.delete(categories).where(eq(categories.id, Number(id)))
}

export async function moveCategoryOrder(id, direction) {
  const db = await getDb()
  const [cat] = await db.select({ id: categories.id, sortOrder: categories.sortOrder, parentId: categories.parentId })
    .from(categories).where(eq(categories.id, Number(id))).limit(1)
  if (!cat) return

  const siblings = await db.select({ id: categories.id, sortOrder: categories.sortOrder })
    .from(categories)
    .where(cat.parentId ? eq(categories.parentId, cat.parentId) : sql`parent_id is null`)
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  const idx = siblings.findIndex((s) => s.id === cat.id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= siblings.length) return

  const other = siblings[swapIdx]
  await db.update(categories).set({ sortOrder: other.sortOrder }).where(eq(categories.id, cat.id))
  await db.update(categories).set({ sortOrder: cat.sortOrder }).where(eq(categories.id, other.id))
}

export async function dashboardStats() {
  const db = await getDb()
  const [r] = await db.select({
    total: sql`count(*)::int`,
    published: sql`count(*) filter (where ${products.status} = 'published')::int`,
    noSpecies: sql`count(*) filter (where ${speciesSubquery} = '{}')::int`,
    noAvailability: sql`count(*) filter (where ${products.availability} is null)::int`,
    noDescription: sql`count(*) filter (where ${products.description} is null or ${products.description} = '')::int`,
    flex: sql`count(*) filter (where ${products.flexAvailable})::int`,
  }).from(products)
  return r
}


/* ------------------------------------------------------------------ images */

export async function listImages(productId) {
  const db = await getDb()
  return db.select({
    id: productImages.id,
    storageKey: productImages.storageKey,
    altText: productImages.altText,
    role: productImages.role,
    width: productImages.width,
    height: productImages.height,
    sortOrder: productImages.sortOrder,
  }).from(productImages)
    .where(eq(productImages.productId, Number(productId)))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id))
}

export async function addImage(productId, { storageKey, altText, role = 'product_photo', width = null, height = null }) {
  const db = await getDb()
  const [{ next }] = await db.select({
    next: sql`coalesce(max(${productImages.sortOrder}), -1) + 1`,
  }).from(productImages).where(eq(productImages.productId, Number(productId)))

  await db.insert(productImages).values({
    productId: Number(productId),
    storageKey,
    altText: altText || 'Product image',
    role,
    width,
    height,
    sortOrder: Number(next) || 0,
  })
}

export async function updateImage(imageId, { altText, role }) {
  const db = await getDb()
  const set = {}
  if (altText !== undefined) set.altText = altText || 'Product image'
  if (role !== undefined) set.role = role
  if (Object.keys(set).length) {
    await db.update(productImages).set(set).where(eq(productImages.id, Number(imageId)))
  }
}

export async function removeImage(imageId) {
  const db = await getDb()
  const [row] = await db.select({ storageKey: productImages.storageKey })
    .from(productImages).where(eq(productImages.id, Number(imageId))).limit(1)
  await db.delete(productImages).where(eq(productImages.id, Number(imageId)))
  return row?.storageKey ?? null
}

/** Moves an image up or down and renumbers the whole set. */
export async function moveImage(productId, imageId, direction) {
  const db = await getDb()
  const rows = await listImages(productId)
  const i = rows.findIndex((r) => r.id === Number(imageId))
  if (i === -1) return
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= rows.length) return
  ;[rows[i], rows[j]] = [rows[j], rows[i]]
  for (const [order, r] of rows.entries()) {
    await db.update(productImages).set({ sortOrder: order }).where(eq(productImages.id, r.id))
  }
}
