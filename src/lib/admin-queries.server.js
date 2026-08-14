import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, categories, attributes, attributeValues, productAttributes,
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
