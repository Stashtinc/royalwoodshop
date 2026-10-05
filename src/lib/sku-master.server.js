import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import {
  products, categories, productCategories, attributes, attributeValues,
  productAttributes, productImages,
} from '../db/schema.js'
import { SPECIES } from './catalogue-constants.js'
import { canon } from './species-import.server.js'

/**
 * The Master Product List, one row per SKU.
 *
 * Brad's ERP lists every species of a profile as its own part: CAS-302 is
 * CAS-302-AP-R in poplar and CAS-302-RO-R in red oak; flat stock carries the
 * species first (AP-1/2X1/2). So the sheet does too: a row per Part ID, with
 * the species and its availability in columns rather than a column per wood.
 *
 * The site still has one page per profile. Base Code groups the rows back
 * into that product; the product's own fields (name, category, size…) repeat
 * on each of its rows and the first filled-in value wins.
 *
 * Import does not get its own write path: each group becomes the row the
 * column-per-species import already understands, so categories, images,
 * availability and archiving behave exactly as before.
 */

export const SKU_SHEET = 'Master Product List'
export const SKU_HEADERS = [
  'Part ID', 'Base Code', 'image name', 'Product Name', 'Category', 'type sub-cat',
  'Size', 'Description', 'Species', 'Availability', 'Price', 'UOM',
]

const FLEX = 'Flex'
/** Ticked, availability not known yet. Keeps the species on re-import. */
export const TICK_ONLY = '✓'
const AVAIL_TICK = { in_stock: 'S', quick_ship: 'QS', made_to_order: 'MO' }
const SPECIES_BY_KEY = new Map([...SPECIES, FLEX].map((s) => [canon(s), s]))
const SPECIES_ORDER = (s) => { const i = SPECIES.indexOf(s); return i === -1 ? (s === FLEX ? 900 : 950) : i }

/* ------------------------------------------------------------------ export */

/** Every SKU row, products in category then code order. */
export async function skuRows(db) {
  const rows = await db.select({
    id: products.id, code: products.productCode, name: products.name,
    description: products.description, size: products.sizeDisplay, price: products.price,
    uom: products.uom, flex: products.flexAvailable, flexAvailability: products.flexAvailability,
    category: categories.name,
  })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(ne(products.status, 'archived'))
    .orderBy(asc(categories.name), asc(products.productCode), asc(products.name))
  const ids = rows.map((r) => r.id)
  if (!ids.length) return []

  const allCats = await db.select({ id: categories.id, name: categories.name }).from(categories)
  const catName = new Map(allCats.map((c) => [c.id, c.name]))
  const subRows = await db
    .select({ productId: productCategories.productId, sub: categories.name, parentId: categories.parentId })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(isNotNull(categories.parentId), inArray(productCategories.productId, ids)))
  const placements = new Map()
  for (const s of subRows) {
    if (!placements.has(s.productId)) placements.set(s.productId, [])
    placements.get(s.productId).push({ category: catName.get(s.parentId) ?? '', sub: s.sub })
  }

  const ticks = await db
    .select({ productId: productAttributes.productId, species: attributeValues.value, availability: productAttributes.availability })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .innerJoin(attributes, and(eq(attributes.id, attributeValues.attributeId), eq(attributes.key, 'species')))
    .where(inArray(productAttributes.productId, ids))
  const speciesOf = new Map()
  for (const t of ticks) {
    if (!speciesOf.has(t.productId)) speciesOf.set(t.productId, new Map())
    speciesOf.get(t.productId).set(t.species, t.availability)
  }

  const parts = await db.select({
    productId: productPartIds.productId, species: productPartIds.species,
    partId: productPartIds.partId, uom: productPartIds.uom,
  }).from(productPartIds).where(inArray(productPartIds.productId, ids))
  const partsOf = new Map()
  for (const p of parts) {
    if (!partsOf.has(p.productId)) partsOf.set(p.productId, [])
    partsOf.get(p.productId).push(p)
  }

  const images = await db.select({ productId: productImages.productId, key: productImages.storageKey })
    .from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sortOrder))
  const imagesOf = new Map()
  for (const i of images) {
    const f = i.key.split('/').pop()
    imagesOf.set(i.productId, imagesOf.has(i.productId) ? `${imagesOf.get(i.productId)}|${f}` : f)
  }

  const out = []
  for (const p of rows) {
    // Primary category first, as the column-per-species sheet had it.
    const pl = (placements.get(p.id) ?? []).sort((a, b) => (b.category === p.category) - (a.category === p.category))
    const cats = pl.length ? [...new Set(pl.map((x) => x.category))].join('|') : (p.category ?? '')
    const base = {
      code: p.code ?? '', image: imagesOf.get(p.id) ?? '', name: p.name ?? '', category: cats,
      sub: pl.map((x) => x.sub).join('|'), size: p.size ?? '', description: p.description ?? '',
      price: p.price ?? '', uom: p.uom ?? '',
    }
    const avail = new Map(speciesOf.get(p.id) ?? [])
    if (p.flex) avail.set(FLEX, p.flexAvailability)
    const tick = (s) => (avail.has(s) ? (AVAIL_TICK[avail.get(s)] ?? TICK_ONLY) : '')

    const skus = []
    const covered = new Set()
    for (const part of partsOf.get(p.id) ?? []) {
      skus.push({ partId: part.partId, species: part.species, availability: tick(part.species), uom: part.uom })
      covered.add(part.species)
    }
    // A species sold without a Part ID yet still gets its row, so it is not lost.
    for (const s of avail.keys()) {
      if (!covered.has(s)) skus.push({ partId: '', species: s, availability: tick(s) })
    }
    skus.sort((a, b) => SPECIES_ORDER(a.species) - SPECIES_ORDER(b.species) || a.partId.localeCompare(b.partId))
    if (!skus.length) skus.push({ partId: '', species: '', availability: '' })

    for (const s of skus) {
      out.push([
        s.partId, base.code, base.image, base.name, base.category, base.sub, base.size,
        base.description, s.species, s.availability, base.price, base.uom || s.uom || '',
      ])
    }
  }
  return out
}

/* ------------------------------------------------------------------ import */

/** The SKU sheet in an upload's grid, or null when this is not one. */
function readSkuGrid(grid) {
  const at = grid.findIndex((row) => {
    const keys = row.map(canon)
    return keys.includes('part id') && keys.includes('base code') && keys.includes('species')
  })
  if (at === -1) return null
  const keys = grid[at].map(canon)
  return grid.slice(at + 1)
    .map((row) => Object.fromEntries(keys.map((k, i) => [k, String(row[i] ?? '').trim()])))
    .filter((r) => r['part id'] || r['base code'])
}

/** The SKU rows in an uploaded workbook (or CSV), or null when it has none. */
export async function readSkuSheet(buffer) {
  const buf = Buffer.from(buffer)
  const isBook = (buf[0] === 0x50 && buf[1] === 0x4b) || (buf[0] === 0xd0 && buf[1] === 0xcf)
  if (isBook) {
    const mod = await import('xlsx')
    const XLSX = mod.default ?? mod
    let book
    try { book = XLSX.read(buf, { type: 'buffer' }) } catch { return null }
    for (const name of book.SheetNames) {
      const rows = readSkuGrid(XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '' }))
      if (rows) return { rows, sheetName: name }
    }
    return null
  }
  const { parse } = await import('csv-parse/sync')
  try {
    const rows = readSkuGrid(parse(buf.toString('utf8'), { relax_column_count: true, bom: true }))
    return rows ? { rows, sheetName: null } : null
  } catch { return null }
}

const PRODUCT_FIELDS = [
  ['image name', 'image name'], ['product name', 'product name'], ['category', 'category'],
  ['type sub-cat', 'type sub-cat'], ['size', 'size'], ['description', 'description'],
  ['price', 'price'], ['uom', 'uom (lft, ea, sqft, kit, pc)'],
]

/**
 * Groups SKU rows by Base Code into the rows the column-per-species import
 * reads, plus the Part IDs to store. Rows of one product that disagree on a
 * product field are reported; the first filled-in value is used.
 */
export function skuRowsToMaster(skuRows) {
  // Grouped ignoring case, but the code keeps its own spelling: 113 products
  // have lowercase codes (c400-hanger) and the import matches them as typed.
  // A row with no code at all stands alone: two code-less products can share
  // a name (an 8ft and a standard door), and the import skips them anyway.
  const groups = new Map()
  for (const [i, r] of skuRows.entries()) {
    const code = r['base code'] || r['part id']
    const key = code ? `code:${code.toUpperCase()}` : `row:${i}`
    if (!groups.has(key)) groups.set(key, { code, rows: [] })
    groups.get(key).rows.push(r)
  }

  const masterRows = []
  const partRows = []
  const conflicts = []
  for (const { code, rows } of groups.values()) {
    const m = { code }
    for (const [from, to] of PRODUCT_FIELDS) {
      const values = [...new Set(rows.map((r) => r[from]).filter(Boolean))]
      m[to] = values[0] ?? ''
      if (values.length > 1) conflicts.push({ code, field: from, values })
    }
    const other = []
    for (const r of rows) {
      if (!r.species) continue
      const species = SPECIES_BY_KEY.get(canon(r.species))
      // Blank availability still means "sold in this wood"; the import keeps
      // the species without inventing an availability for it.
      const tick = r.availability || TICK_ONLY
      if (species === FLEX) m[canon(FLEX)] = tick
      else if (species) m[canon(species)] = tick
      else other.push(r.species)
      if (r['part id']) {
        partRows.push({ 'part id': r['part id'], 'base code': code, species: r.species, uom: r.uom, name: '', category: r.category, keepName: true })
      }
    }
    m.other = [...new Set(other)].join('|')
    masterRows.push(m)
  }
  return { masterRows, partRows, conflicts, products: groups.size }
}
