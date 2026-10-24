import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  attributes, attributeValues, attributeCategories, productAttributes, categories,
} from '../db/schema.js'

/** "Dark Stain" → "dark-stain". Keys and value slugs are built from names. */
export const slugify = (s) => String(s ?? '').trim().toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Top-level categories, for choosing where an attribute applies. */
export async function categoryOptions() {
  const db = await getDb()
  return db.select({ id: categories.id, name: categories.name }).from(categories)
    .where(isNull(categories.parentId)).orderBy(asc(categories.name))
}

/** Every attribute with its scope, how many values it has, and how many products use it. */
export async function listAttributes() {
  const db = await getDb()
  const rows = await db.select().from(attributes).orderBy(asc(attributes.sortOrder), asc(attributes.name))
  const valueCount = new Map()
  for (const r of await db.select({ attributeId: attributeValues.attributeId, n: sql`count(*)::int` })
    .from(attributeValues).groupBy(attributeValues.attributeId)) valueCount.set(r.attributeId, r.n)
  const productCount = new Map()
  for (const r of await db.select({ attributeId: attributeValues.attributeId, n: sql`count(distinct ${productAttributes.productId})::int` })
    .from(productAttributes).innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .groupBy(attributeValues.attributeId)) productCount.set(r.attributeId, r.n)
  const scope = new Map()
  for (const r of await db.select({ attributeId: attributeCategories.attributeId, name: categories.name })
    .from(attributeCategories).innerJoin(categories, eq(categories.id, attributeCategories.categoryId))) {
    if (!scope.has(r.attributeId)) scope.set(r.attributeId, [])
    scope.get(r.attributeId).push(r.name)
  }
  return rows.map((a) => ({
    id: a.id, key: a.key, name: a.name,
    categories: (scope.get(a.id) ?? []).sort(),
    values: valueCount.get(a.id) ?? 0,
    products: productCount.get(a.id) ?? 0,
  }))
}

/** One attribute, with its values (and how many products use each) and its scope. */
export async function getAttribute(id) {
  const db = await getDb()
  const [a] = await db.select().from(attributes).where(eq(attributes.id, Number(id))).limit(1)
  if (!a) return null
  const values = await db.select().from(attributeValues)
    .where(eq(attributeValues.attributeId, a.id)).orderBy(asc(attributeValues.sortOrder), asc(attributeValues.value))
  const uses = new Map()
  if (values.length) {
    for (const r of await db.select({ valueId: productAttributes.attributeValueId, n: sql`count(*)::int` })
      .from(productAttributes).where(inArray(productAttributes.attributeValueId, values.map((v) => v.id)))
      .groupBy(productAttributes.attributeValueId)) uses.set(r.valueId, r.n)
  }
  const scopeIds = (await db.select({ categoryId: attributeCategories.categoryId })
    .from(attributeCategories).where(eq(attributeCategories.attributeId, a.id))).map((r) => r.categoryId)
  const products = await db.select({ n: sql`count(distinct ${productAttributes.productId})::int` })
    .from(productAttributes).innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .where(eq(attributeValues.attributeId, a.id))
  return {
    id: a.id, key: a.key, name: a.name,
    scopeIds,
    productCount: products[0]?.n ?? 0,
    values: values.map((v) => ({ id: v.id, value: v.value, slug: v.slug, uses: uses.get(v.id) ?? 0 })),
  }
}

/** Creates an attribute. Its key comes from the name and must be unused. */
export async function createAttribute({ name, categoryIds }) {
  const db = await getDb()
  const key = slugify(name)
  if (!key) throw new Error('Name is required.')
  const [taken] = await db.select({ id: attributes.id }).from(attributes).where(eq(attributes.key, key)).limit(1)
  if (taken) throw new Error(`There is already an attribute called "${name}".`)
  const [{ max }] = await db.select({ max: sql`coalesce(max(${attributes.sortOrder}), 0)::int` }).from(attributes)
  const [row] = await db.insert(attributes).values({ key, name: name.trim(), sortOrder: max + 10 }).returning({ id: attributes.id })
  await setScope(row.id, categoryIds)
  return row.id
}

export async function renameAttribute(id, name) {
  const db = await getDb()
  const clean = String(name ?? '').trim()
  if (!clean) throw new Error('Name cannot be blank.')
  await db.update(attributes).set({ name: clean }).where(eq(attributes.id, Number(id)))
}

/** Replaces the categories an attribute applies to. */
export async function setScope(id, categoryIds) {
  const db = await getDb()
  const ids = [...new Set((categoryIds ?? []).map(Number).filter(Boolean))]
  await db.transaction(async (tx) => {
    await tx.delete(attributeCategories).where(eq(attributeCategories.attributeId, Number(id)))
    if (ids.length) await tx.insert(attributeCategories).values(ids.map((categoryId) => ({ attributeId: Number(id), categoryId })))
  })
}

/** Deletes an attribute only when no product uses any of its values. */
export async function deleteAttribute(id) {
  const a = await getAttribute(id)
  if (!a) throw new Error('That attribute no longer exists.')
  if (a.productCount > 0) throw new Error(`${a.name} is used by ${a.productCount} product${a.productCount === 1 ? '' : 's'}. Remove it from them first.`)
  const db = await getDb()
  await db.delete(attributes).where(eq(attributes.id, Number(id)))
}

/** Adds values from one or more lines of text. Duplicates (by slug) are skipped. */
export async function addValues(attributeId, text) {
  const db = await getDb()
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const existing = new Set((await db.select({ slug: attributeValues.slug }).from(attributeValues)
    .where(eq(attributeValues.attributeId, Number(attributeId)))).map((r) => r.slug))
  const [{ max }] = await db.select({ max: sql`coalesce(max(${attributeValues.sortOrder}), 0)::int` })
    .from(attributeValues).where(eq(attributeValues.attributeId, Number(attributeId)))
  const rows = []
  const skipped = []
  let order = max
  for (const value of lines) {
    const slug = slugify(value)
    if (!slug) continue
    if (existing.has(slug)) { skipped.push(value); continue }
    existing.add(slug)
    order += 10
    rows.push({ attributeId: Number(attributeId), value, slug, sortOrder: order })
  }
  if (rows.length) await db.insert(attributeValues).values(rows)
  return { added: rows.length, skipped }
}

export async function renameValue(valueId, value) {
  const db = await getDb()
  const clean = String(value ?? '').trim()
  if (!clean) throw new Error('A value cannot be blank.')
  await db.update(attributeValues).set({ value: clean }).where(eq(attributeValues.id, Number(valueId)))
}

/** Removes a value. Products that had it lose that tick; the products themselves stay. */
export async function deleteValue(valueId) {
  const db = await getDb()
  await db.delete(attributeValues).where(eq(attributeValues.id, Number(valueId)))
}
