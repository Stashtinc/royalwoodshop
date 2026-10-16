import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, categories, productCategories, attributes, attributeValues, productAttributes, productImages, productPartIds,
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

export async function listProducts({ q = '', page = 1, perPage = 25, missing = '', category = '', categoryId = null, subCategoryId = null, species = '', availability = '', sortBy = 'code', sortDir = 'asc', status = 'active', photosFirst = true } = {}) {
  const db = await getDb()
  const where = []
  // Default: hide archived. Pass status='all' or status='archived' to see them.
  if (status === 'active') where.push(sql`${products.status} != 'archived'`)
  else if (status === 'archived') where.push(eq(products.status, 'archived'))
  else if (status === 'draft') where.push(eq(products.status, 'draft'))
  // status='all' → no filter

  if (q.trim()) {
    where.push(or(
      ilike(products.name, `%${q.trim()}%`),
      ilike(products.productCode, `%${q.trim()}%`),
      ilike(products.slug, `%${q.trim()}%`),
      sql`exists (select 1 from product_part_ids pp where pp.product_id = ${products.id} and pp.part_id ilike ${`%${q.trim()}%`})`,
    ))
  }
  if (missing === 'species') where.push(sql`${speciesSubquery} = '{}'`)
  if (missing === 'availability') where.push(sql`${products.availability} is null`)
  if (missing === 'description') where.push(sql`(${products.description} is null or ${products.description} = '')`)
  if (missing === 'no_image') where.push(sql`not exists (select 1 from product_images pi where pi.product_id = ${products.id})`)
  if (missing === 'has_image') where.push(sql`exists (select 1 from product_images pi where pi.product_id = ${products.id})`)
  if (category) where.push(ilike(categories.name, category))
  // A category matches products filed under it or under any of its sub-categories.
  if (subCategoryId) {
    where.push(sql`(${products.primaryCategoryId} = ${subCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = ${subCategoryId}))`)
  } else if (categoryId) {
    where.push(sql`exists (select 1 from categories c where (c.id = ${categoryId} or c.parent_id = ${categoryId}) and (c.id = ${products.primaryCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = c.id)))`)
  }
  if (species) where.push(sql`${speciesSubquery}::text[] @> array[${species}]::text[]`)
  if (availability) where.push(eq(products.availability, availability))

  const clause = where.length ? and(...where) : undefined
  const [{ total }] = await db.select({ total: sql`count(*)::int` })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(clause)

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
    views: products.views,
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
        updated: [d(products.updatedAt), d(products.id)],
        views: [d(products.views), asc(products.productCode)],
      }
      const order = cols[sortBy] ?? [asc(products.productCode), asc(products.name)]
      // Products with a photo come first; the chosen sort applies within each group.
      return photosFirst && sortBy !== 'views'
        ? [sql`exists (select 1 from product_images pi where pi.product_id = ${products.id}) desc`, ...order]
        : order
    })())
    .limit(perPage).offset((page - 1) * perPage)

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)), sortBy, sortDir }
}

/** Archives every product matching the given search/filter (ignores pagination — affects all). */
export async function bulkArchiveProducts({ q = '', missing = '', category = '', species = '', availability = '' } = {}) {
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
  // A category matches products filed under it or under any of its sub-categories.
  if (subCategoryId) {
    where.push(sql`(${products.primaryCategoryId} = ${subCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = ${subCategoryId}))`)
  } else if (categoryId) {
    where.push(sql`exists (select 1 from categories c where (c.id = ${categoryId} or c.parent_id = ${categoryId}) and (c.id = ${products.primaryCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = c.id)))`)
  }
  if (species) where.push(sql`${speciesSubquery}::text[] @> array[${species}]::text[]`)
  if (availability) where.push(eq(products.availability, availability))

  const clause = where.length ? and(...where) : undefined

  // Collect IDs via join (category filter needs the join)
  const matched = await db
    .select({ id: products.id })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(clause)

  if (!matched.length) return 0
  const ids = matched.map(r => r.id)
  await db.update(products)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(inArray(products.id, ids))
  return ids.length
}

/** Publishes every product matching the given search/filter (ignores pagination — affects all). */
export async function bulkPublishProducts({ q = '', missing = '', category = '', species = '', availability = '' } = {}) {
  const db = await getDb()
  const where = [sql`${products.status} != 'published'`]
  if (q.trim()) {
    where.push(or(
      ilike(products.name, `%${q.trim()}%`),
      ilike(products.productCode, `%${q.trim()}%`),
      ilike(products.slug, `%${q.trim()}%`),
    ))
  }
  if (category) where.push(ilike(categories.name, category))
  // A category matches products filed under it or under any of its sub-categories.
  if (subCategoryId) {
    where.push(sql`(${products.primaryCategoryId} = ${subCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = ${subCategoryId}))`)
  } else if (categoryId) {
    where.push(sql`exists (select 1 from categories c where (c.id = ${categoryId} or c.parent_id = ${categoryId}) and (c.id = ${products.primaryCategoryId} or exists (select 1 from product_categories pc where pc.product_id = ${products.id} and pc.category_id = c.id)))`)
  }

  const matched = await db
    .select({ id: products.id })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(and(...where))

  if (!matched.length) return 0
  const ids = matched.map(r => r.id)
  await db.update(products)
    .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
    .where(inArray(products.id, ids))
  return ids.length
}

export async function getProduct(id) {
  const db = await getDb()
  const [row] = await db.select({
    id: products.id, slug: products.slug, productCode: products.productCode,
    name: products.name, description: products.description,
    sizeDisplay: products.sizeDisplay, thicknessIn: products.thicknessIn,
    widthIn: products.widthIn, availability: products.availability,
    uom: products.uom,
    leadTime: products.leadTime, flexAvailable: products.flexAvailable, flexAvailability: products.flexAvailability,
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
    uom: data.uom || null,
    flexAvailability: data.flexAvailability || null,
    flexAvailable: !!data.flexAvailability,
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
  }

  // Overall availability is the best of the species' — Flex included, as on
  // the Master Product List — so a Flex-only product still gets one.
  const speciesAvailValues = [...chosen.map((s) => data.speciesAvail?.[s]), data.flexAvailability].filter(Boolean)
  if (speciesAvailValues.length) {
    const { bestAvailability } = await import('./catalogue-constants.js')
    await db.update(products)
      .set({ availability: bestAvailability(speciesAvailValues) })
      .where(eq(products.id, row.id))
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
    uom: data.uom || null,
    leadTime: data.leadTime || null,
    flexAvailability: data.flexAvailability || null,
    flexAvailable: !!data.flexAvailability,
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
    // A species added on the product page (e.g. 48" Double) is not a value yet: create it,
    // or its tick is silently dropped on save.
    await db.insert(attributeValues)
      .values(chosen.map((s) => ({
        attributeId: attr.id, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'), value: s, sortOrder: 9999,
      })))
      .onConflictDoNothing()
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
  // Flex counts as a species here, as it does on the Master Product List.
  const speciesAvailValues = [...chosen.map((s) => speciesAvail[s]), data.flexAvailability].filter(Boolean)
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
    // Archived products are not counted: they are off the site.
    productCount: sql`(select count(distinct pc.product_id)::int from product_categories pc
      join products p on p.id = pc.product_id and p.status <> 'archived'
      where pc.category_id = categories.id)`.as('product_count'),
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

/**
 * Another category with this name under the same parent (case-insensitive) —
 * two "French" sub-categories look like one in every menu. Returns its name or null.
 */
export async function siblingNameTaken(name, { parentId = null, id = null } = {}) {
  const db = await getDb()
  let parent = parentId
  if (id && parentId === null) {
    const [self] = await db.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, Number(id)))
    parent = self?.parentId ?? null
  }
  const [hit] = await db.select({ name: categories.name }).from(categories).where(and(
    sql`lower(trim(${categories.name})) = lower(trim(${name}))`,
    parent ? eq(categories.parentId, Number(parent)) : sql`${categories.parentId} is null`,
    id ? sql`${categories.id} <> ${Number(id)}` : sql`true`,
  )).limit(1)
  return hit?.name ?? null
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

/** Sets the display order of sibling categories to the order of `ids` (all must share a parent). */
export async function reorderCategories(ids) {
  const list = ids.map(Number).filter(Boolean)
  if (!list.length) return
  const db = await getDb()
  const rows = await db.select({ id: categories.id, parentId: categories.parentId })
    .from(categories).where(inArray(categories.id, list))
  if (rows.length !== list.length || new Set(rows.map((r) => r.parentId ?? 0)).size !== 1) return
  for (const [i, id] of list.entries()) await db.update(categories).set({ sortOrder: i }).where(eq(categories.id, id))
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

  // Siblings that were never ordered all share 0 (shown A–Z), so swapping two
  // numbers would change nothing: number them 0, 1, 2… in the order shown, then swap.
  ;[siblings[idx], siblings[swapIdx]] = [siblings[swapIdx], siblings[idx]]
  for (const [i, s] of siblings.entries()) {
    if (s.sortOrder !== i) await db.update(categories).set({ sortOrder: i }).where(eq(categories.id, s.id))
  }
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

export async function addImage(productId, { storageKey, altText, role = 'profile_drawing', width = null, height = null }) {
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

/** Deletes one product. Returns image storageKeys so the caller can remove files. */
export async function deleteProduct(id) {
  const db = await getDb()
  const imgs = await db.select({ storageKey: productImages.storageKey })
    .from(productImages).where(eq(productImages.productId, Number(id)))
  await db.delete(products).where(eq(products.id, Number(id)))
  return imgs.map((i) => i.storageKey)
}

/** Archives the given product IDs. Returns count updated. */
export async function archiveProductsByIds(ids) {
  if (!ids.length) return 0
  const db = await getDb()
  await db.update(products)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(inArray(products.id, ids))
  return ids.length
}

/** Sets the given product IDs to published. Returns count updated. */
export async function activateProductsByIds(ids) {
  if (!ids.length) return 0
  const db = await getDb()
  await db.update(products)
    .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
    .where(inArray(products.id, ids))
  return ids.length
}

/** Deletes multiple products by ID. Returns all image storageKeys for file cleanup. */
export async function bulkDeleteProducts(ids) {
  if (!ids.length) return []
  const db = await getDb()
  const numIds = ids.map(Number)
  const imgs = await db.select({ storageKey: productImages.storageKey })
    .from(productImages).where(inArray(productImages.productId, numIds))
  await db.delete(products).where(inArray(products.id, numIds))
  return imgs.map((i) => i.storageKey)
}

/** Gets part IDs, prices and sale prices for a product */
export async function getProductPartIds(productId) {
  const db = await getDb()
  const rows = await db.select({
    species: productPartIds.species,
    partId: productPartIds.partId,
    price: productPartIds.price,
    salePrice: productPartIds.salePrice,
  })
    .from(productPartIds).where(eq(productPartIds.productId, Number(productId)))
    .orderBy(asc(productPartIds.id))
  const partIds = {}
  const prices = {}
  const salePrices = {}
  // The editor has one box per species; a species with several Part IDs shows its first.
  for (const { species, partId, price, salePrice } of rows) {
    if (species in partIds) continue
    partIds[species] = partId ?? ''
    if (price) prices[species] = price
    if (salePrice) salePrices[species] = salePrice
  }
  return { partIds, prices, salePrices }
}

/** The product (other than `exceptId`) already using this code, ignoring case and spaces; or null. */
export async function productWithCode(code, exceptId = null) {
  const c = String(code ?? '').trim()
  if (!c) return null
  const db = await getDb()
  const rows = await db.select({ id: products.id, name: products.name, status: products.status })
    .from(products).where(sql`upper(trim(${products.productCode})) = ${c.toUpperCase()}`)
  return rows.find((r) => r.id !== Number(exceptId)) ?? null
}

/** Part IDs from `partIds` already used by a product other than `exceptId`. */
export async function partIdsInUse(partIds, exceptId = null) {
  const wanted = partIds.filter(Boolean)
  if (!wanted.length) return []
  const db = await getDb()
  const rows = await db.select({
    partId: productPartIds.partId, productId: productPartIds.productId, species: productPartIds.species,
    name: products.name, code: products.productCode,
  })
    .from(productPartIds).innerJoin(products, eq(products.id, productPartIds.productId))
    .where(inArray(productPartIds.partId, wanted))
  // Says where it is, so it can be found: "T&G-1719-DF-R (Douglas Fir on 1X6 V-Groove Panelling, T&G-1719-KP-16)".
  return rows.filter((r) => r.productId !== Number(exceptId))
    .map((r) => `${r.partId} (${r.species} on ${r.name.trim()}${r.code ? `, ${r.code}` : ''})`)
}

/**
 * Saves the editor's Part ID, price and sale price per species:
 * entries = { [species]: { partId, price, salePrice } }, blanks as null.
 * Only each species' first row is touched, so extra Part IDs (Flex lengths,
 * species without a box) stay as the import left them.
 */
export async function saveProductPartIds(productId, entries) {
  const db = await getDb()
  const pid = Number(productId)
  const existing = await db.select({ id: productPartIds.id, species: productPartIds.species })
    .from(productPartIds).where(eq(productPartIds.productId, pid)).orderBy(asc(productPartIds.id))
  const firstRow = new Map()
  for (const r of existing) if (!firstRow.has(r.species)) firstRow.set(r.species, r.id)

  await db.transaction(async (tx) => {
    // A Part ID the editor sends for a wood may already sit on this product as an
    // extra row under another wood (the import filed it there). Its row is
    // replaced, so the unique Part ID index does not reject the save.
    const sent = Object.values(entries).map((e) => e.partId).filter(Boolean)
    const kept = [...firstRow.values()]
    if (sent.length) {
      await tx.delete(productPartIds).where(and(
        eq(productPartIds.productId, pid), inArray(productPartIds.partId, sent),
        ...(kept.length ? [sql`${productPartIds.id} not in (${sql.join(kept.map((k) => sql`${k}`), sql`, `)})`] : []),
      ))
    }
    for (const [species, { partId, price, salePrice }] of Object.entries(entries)) {
      const id = firstRow.get(species)
      const empty = !partId && !price && !salePrice
      if (id && empty) await tx.delete(productPartIds).where(eq(productPartIds.id, id))
      else if (id) await tx.update(productPartIds).set({ partId, price, salePrice }).where(eq(productPartIds.id, id))
      else if (!empty) await tx.insert(productPartIds).values({ productId: pid, species, partId, price, salePrice })
    }
  })
}
