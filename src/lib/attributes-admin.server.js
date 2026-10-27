import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  attributes, attributeValues, attributeCategories, productAttributes, categories, products,
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
/** Attributes that are managed elsewhere and never listed here: species are edited on
 *  each product (their values are the species ticks), so they must not be changed here. */
const NOT_MANAGED_HERE = new Set(['species'])

export async function listAttributes() {
  const db = await getDb()
  const rows = (await db.select().from(attributes).orderBy(asc(attributes.sortOrder), asc(attributes.name)))
    .filter((a) => !NOT_MANAGED_HERE.has(a.key))
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
  const custom = rows.map((a) => ({
    id: a.id, key: a.key, name: a.name, builtin: false,
    categories: (scope.get(a.id) ?? []).sort(),
    values: valueCount.get(a.id) ?? 0,
    products: productCount.get(a.id) ?? 0,
  }))
  return custom
}

/** One attribute, with its values (and how many products use each) and its scope. */
export async function getAttribute(id) {
  const db = await getDb()
  const [a] = await db.select().from(attributes).where(eq(attributes.id, Number(id))).limit(1)
  if (!a || NOT_MANAGED_HERE.has(a.key)) return null
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

/** Removes a value. Products that had it lose that tick; the products themselves stay.
 *  For Height, the product's number is cleared too, so the two never disagree. */
export async function deleteValue(valueId) {
  const db = await getDb()
  const [v] = await db.select({ slug: attributeValues.slug, key: attributes.key }).from(attributeValues)
    .innerJoin(attributes, eq(attributes.id, attributeValues.attributeId))
    .where(eq(attributeValues.id, Number(valueId))).limit(1)
  await db.delete(attributeValues).where(eq(attributeValues.id, Number(valueId)))
  if (v?.key === 'height') await db.update(products).set({ heightIn: null }).where(eq(products.heightIn, v.slug))
}

/** The attributes a product is described by on its edit page, with every value.
 *  Species are not here: they are set by the species editor. */
export async function managedAttributes() {
  const db = await getDb()
  const rows = (await db.select().from(attributes).orderBy(asc(attributes.sortOrder), asc(attributes.name)))
    .filter((a) => !NOT_MANAGED_HERE.has(a.key))
  if (!rows.length) return []
  const values = await db.select().from(attributeValues)
    .where(inArray(attributeValues.attributeId, rows.map((a) => a.id)))
    .orderBy(asc(attributeValues.sortOrder), asc(attributeValues.value))
  const scopes = await db.select().from(attributeCategories)
    .where(inArray(attributeCategories.attributeId, rows.map((a) => a.id)))
  return rows.map((a) => ({
    id: a.id, key: a.key, name: a.name,
    // Top-level categories the attribute applies to (none = every product).
    scopeIds: scopes.filter((s) => s.attributeId === a.id).map((s) => s.categoryId),
    values: values.filter((v) => v.attributeId === a.id).map((v) => ({ id: v.id, value: v.value, slug: v.slug })),
  }))
}

/** The attributes that apply to a product, given the category ids it is linked to
 *  (top-level and sub-level) and the category tree. An attribute applies when one of
 *  its categories is the product's top-level category, or when it has no categories. */
export function attributesFor(attrs, linkedIds, tree) {
  const linked = new Set(linkedIds)
  const topIds = new Set(tree.filter((c) => linked.has(c.id) || c.subcategories.some((s) => linked.has(s.id))).map((c) => c.id))
  return attrs.filter((a) => a.scopeIds.length === 0 || a.scopeIds.some((id) => topIds.has(id)))
}

/** The value ids a product is ticked with, grouped by attribute id. */
export async function productAttributeValues(productId) {
  const db = await getDb()
  const rows = await db.select({ attributeId: attributeValues.attributeId, valueId: productAttributes.attributeValueId })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .where(eq(productAttributes.productId, Number(productId)))
  const out = new Map()
  for (const r of rows) {
    if (!out.has(r.attributeId)) out.set(r.attributeId, [])
    out.get(r.attributeId).push(r.valueId)
  }
  return out
}

/** Replaces a product's ticks for one attribute with these value ids. For Height the
 *  product's number follows: the first chosen value in inches, or blank. */
export async function setProductAttribute(productId, attributeId, valueIds) {
  const db = await getDb()
  const pid = Number(productId)
  const attrValues = await db.select({ id: attributeValues.id, slug: attributeValues.slug }).from(attributeValues)
    .where(eq(attributeValues.attributeId, Number(attributeId)))
  const own = new Set(attrValues.map((v) => v.id))
  const chosen = [...new Set((valueIds ?? []).map(Number))].filter((id) => own.has(id))
  if (attrValues.length) {
    await db.delete(productAttributes).where(and(
      eq(productAttributes.productId, pid),
      inArray(productAttributes.attributeValueId, attrValues.map((v) => v.id)),
    ))
  }
  if (chosen.length) {
    await db.insert(productAttributes).values(chosen.map((attributeValueId) => ({ productId: pid, attributeValueId })))
      .onConflictDoNothing()
  }
  const [attr] = await db.select({ key: attributes.key }).from(attributes).where(eq(attributes.id, Number(attributeId))).limit(1)
  if (attr?.key === 'height') {
    const first = attrValues.find((v) => v.id === chosen[0])
    const n = first ? Number(first.slug) : NaN
    await db.update(products).set({ heightIn: Number.isFinite(n) && n > 0 ? n : null }).where(eq(products.id, pid))
  }
}

/** Height from a number of inches (master import, older field): finds or creates its value. */
export async function setProductHeight(productId, heightIn) {
  const db = await getDb()
  const [attr] = await db.select({ id: attributes.id }).from(attributes).where(eq(attributes.key, 'height')).limit(1)
  if (!attr) return
  const n = heightIn == null || heightIn === '' ? NaN : Math.round(Number(heightIn))
  if (!Number.isFinite(n) || n <= 0) return setProductAttribute(productId, attr.id, [])
  const slug = String(n)
  let [value] = await db.select({ id: attributeValues.id }).from(attributeValues)
    .where(and(eq(attributeValues.attributeId, attr.id), eq(attributeValues.slug, slug))).limit(1)
  if (!value) {
    const [{ max }] = await db.select({ max: sql`coalesce(max(${attributeValues.sortOrder}), 0)::int` })
      .from(attributeValues).where(eq(attributeValues.attributeId, attr.id))
    ;[value] = await db.insert(attributeValues).values({ attributeId: attr.id, slug, value: `${n}"`, sortOrder: n }).returning({ id: attributeValues.id })
  }
  return setProductAttribute(productId, attr.id, [value.id])
}

/** The master sheet's attribute columns, after Purchase Increment, in attribute order. */
export async function masterAttributeColumns() {
  return (await managedAttributes()).map((a) => ({ key: a.key, name: a.name }))
}

/** Each product's attribute cells for the master sheet, aligned with masterAttributeColumns():
 *  the value labels ticked, joined with "|". */
export async function productAttributeCells(productIds) {
  const cols = await masterAttributeColumns()
  const out = new Map()
  if (!cols.length || !productIds.length) return out
  const db = await getDb()
  const attrs = await managedAttributes()
  const labelOf = new Map(attrs.flatMap((a) => a.values.map((v) => [v.id, { attr: a.id, value: v.value }])))
  const rows = await db.select({ productId: productAttributes.productId, valueId: productAttributes.attributeValueId })
    .from(productAttributes).where(inArray(productAttributes.productId, productIds))
  const byProduct = new Map()
  for (const r of rows) {
    const l = labelOf.get(r.valueId)
    if (!l) continue
    if (!byProduct.has(r.productId)) byProduct.set(r.productId, new Map())
    const m = byProduct.get(r.productId)
    if (!m.has(l.attr)) m.set(l.attr, [])
    m.get(l.attr).push(l.value)
  }
  for (const [pid, m] of byProduct) {
    out.set(pid, attrs.map((a) => (m.get(a.id) ?? []).join('|')))
  }
  return out
}

/** Applies one product's attribute cells from the master sheet: sheet = { attributeKey: [valueSlugs] }.
 *  An attribute the sheet lists is set to exactly those values; blank clears it. */
export async function setProductAttributesFromSheet(productId, sheet) {
  const db = await getDb()
  const attrs = await db.select().from(attributes)
  for (const [key, slugs] of Object.entries(sheet ?? {})) {
    const attr = attrs.find((a) => a.key === key && !NOT_MANAGED_HERE.has(a.key))
    if (!attr) continue
    const vals = await db.select({ id: attributeValues.id, slug: attributeValues.slug }).from(attributeValues)
      .where(eq(attributeValues.attributeId, attr.id))
    await setProductAttribute(productId, attr.id, vals.filter((v) => slugs.includes(v.slug)).map((v) => v.id))
  }
}
