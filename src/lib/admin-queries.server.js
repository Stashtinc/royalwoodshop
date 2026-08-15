import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, categories, attributes, attributeValues, productAttributes, productImages,
} from '../db/schema.js'

import { SPECIES, AVAILABILITY } from './catalogue-constants.js'
export { SPECIES, AVAILABILITY }

const speciesSubquery = sql`coalesce(
  (select array_agg(av.value order by av.sort_order)
   from product_attributes pa
   join attribute_values av on av.id = pa.attribute_value_id
   join attributes a on a.id = av.attribute_id and a.key = 'species'
   where pa.product_id = products.id), '{}')`

export async function listProducts({ q = '', page = 1, perPage = 25, missing = '' } = {}) {
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
    .orderBy(asc(products.productCode), asc(products.name))
    .limit(perPage).offset((page - 1) * perPage)

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export async function getProduct(id) {
  const db = await getDb()
  const [row] = await db.select({
    id: products.id, slug: products.slug, productCode: products.productCode,
    name: products.name, description: products.description,
    sizeDisplay: products.sizeDisplay, thicknessIn: products.thicknessIn,
    widthIn: products.widthIn, availability: products.availability,
    leadTime: products.leadTime, flexAvailable: products.flexAvailable,
    status: products.status, seoTitle: products.seoTitle,
    seoDescription: products.seoDescription,
    primaryCategoryId: products.primaryCategoryId,
    species: speciesSubquery.as('species'),
  }).from(products).where(eq(products.id, Number(id))).limit(1)
  if (!row) return null
  return { ...row, species: Array.isArray(row.species) ? row.species : [] }
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
    status: data.status,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    updatedAt: new Date(),
  }).where(eq(products.id, Number(id)))

  // species: replace the set
  const [attr] = await db.insert(attributes)
    .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
    .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
    .returning({ id: attributes.id })

  const chosen = data.species ?? []
  await db.delete(productAttributes).where(eq(productAttributes.productId, Number(id)))
  if (chosen.length) {
    const vals = await db.select({ id: attributeValues.id, value: attributeValues.value })
      .from(attributeValues)
      .where(and(eq(attributeValues.attributeId, attr.id), inArray(attributeValues.value, chosen)))
    for (const v of vals) {
      await db.insert(productAttributes)
        .values({ productId: Number(id), attributeValueId: v.id }).onConflictDoNothing()
    }
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
