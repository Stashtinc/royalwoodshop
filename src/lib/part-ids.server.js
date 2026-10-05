import { parse } from 'csv-parse/sync'
import { and, eq } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, attributes, attributeValues, productAttributes,
} from '../db/schema.js'
import { SPECIES } from './catalogue-constants.js'
import { canon } from './species-import.server.js'

/**
 * Per-species Part IDs: the supplier/ERP code for each wood a product is sold
 * in. CAS-302 in poplar is CAS-302-AP-R; flat stock carries the species first,
 * so its Part ID is the product code itself (AP-1/2X1/2).
 *
 * The sheet is Brad's ERP export as-is (Part ID | Name | UOM | Species |
 * Category), or the "Part IDs" tab of the master workbook, which adds a Base
 * Code column. Either way the upload is the whole list: applying it replaces
 * every stored Part ID, so a code dropped from the ERP drops off the site.
 */

export const PART_ID_SHEET = 'Part IDs'
export const PART_ID_HEADERS = ['Part ID', 'Name', 'UOM', 'Species', 'Category', 'Base Code']

const FLEX = 'Flex'
const SPECIES_BY_KEY = new Map(SPECIES.map((s) => [canon(s), s]))
// Spellings seen in the ERP export, mapped to the site's species names.
const SPECIES_ALIASES = new Map([
  ['popllar', 'Poplar'],
  ['primed fj poplar', 'FJ Primed Poplar'],
  ['primed fj pine', 'FJ Primed Pine'],
  ['white pine', 'Clear Pine'],
  ['flex', FLEX],
])

/** The site's name for a species, and whether the site knows it. */
function normaliseSpecies(raw) {
  const key = canon(raw)
  const known = SPECIES_BY_KEY.get(key) ?? SPECIES_ALIASES.get(key)
  if (known) return { species: known, known: true }
  const tidy = String(raw ?? '').trim().replace(/\s+/g, ' ')
  return { species: tidy.replace(/\b\w/g, (c) => c.toUpperCase()), known: false }
}

function gridToRows(grid) {
  const headerIndex = grid.findIndex((row) => row.some((c) => canon(c) === 'part id'))
  if (headerIndex === -1) return null
  const keys = grid[headerIndex].map(canon)
  return grid.slice(headerIndex + 1)
    .map((row) => Object.fromEntries(keys.map((k, i) => [k, String(row[i] ?? '').trim()])))
    .filter((r) => r['part id'])
}

/**
 * The Part ID rows in an upload, or null when it has none. Accepts .xls (the
 * ERP export), .xlsx (the master workbook's Part IDs tab) or CSV.
 */
export async function readPartIdSheet(buffer, fileName = '') {
  const buf = Buffer.from(buffer)
  const isSheet = (buf[0] === 0x50 && buf[1] === 0x4b) || (buf[0] === 0xd0 && buf[1] === 0xcf) || /\.xlsx?$/i.test(fileName)
  if (isSheet) {
    const mod = await import('xlsx')
    const XLSX = mod.default ?? mod
    let book
    try { book = XLSX.read(buf, { type: 'buffer' }) } catch { return null }
    // The master workbook's own tab first, then any sheet with a Part ID column.
    const names = [...book.SheetNames].sort((a, b) => (b === PART_ID_SHEET) - (a === PART_ID_SHEET))
    for (const name of names) {
      const rows = gridToRows(XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '' }))
      if (rows) return { rows, sheetName: name }
    }
    return null
  }
  try {
    const rows = gridToRows(parse(buf.toString('utf8'), { relax_column_count: true, bom: true }))
    return rows ? { rows, sheetName: null } : null
  } catch { return null }
}

/** Every product code (uppercase) → product, longest first for prefix matching. */
function productIndex(rows) {
  const byCode = new Map()
  for (const p of rows) {
    if (!p.code) continue
    const key = p.code.trim().toUpperCase()
    // Two products can share a code; the published one is the real one.
    if (byCode.get(key)?.status === 'published' && p.status !== 'published') continue
    byCode.set(key, p)
  }
  const codes = [...byCode.keys()].sort((a, b) => b.length - a.length)
  return { byCode, codes }
}

/** Finishes on a species Part ID that are not part of the size (flat stock). */
const FINISH_SUFFIX = /-(FJ-PRIMED|FJ-RAW|R-PRIMED|PRIMED|RWHITE|SHED-PINE|R)$/

/**
 * The product a Part ID belongs to. Candidates, in order:
 *   the Base Code, when the sheet gives one;
 *   the code itself;
 *   the longest product code it starts with (CAS-302-AP-R → CAS-302);
 *   flat stock: the species comes first, and the site's page for the size is
 *   D4S-…, so AP-1/2X1/2 and RO-1/2X1/2 both belong to D4S-1/2X1/2.
 * A published product beats an archived one: old species-coded flat stock
 * (AP-1/2X1/2) is archived beside the D4S page that replaced it.
 */
function matchProduct(partId, baseCode, { byCode, codes }) {
  if (baseCode) return byCode.get(baseCode.toUpperCase()) ?? null
  const id = partId.toUpperCase()
  const bare = id.replace(/^FLEX-/, '')
  const candidates = [id, bare]
  const prefix = codes.find((c) => bare.startsWith(`${c}-`))
  if (prefix) candidates.push(prefix)
  const size = bare.match(/^[A-Z]+-(.+)$/)?.[1]?.replace(FINISH_SUFFIX, '')
  if (size) candidates.push(`D4S-${size}`)
  const found = candidates.map((c) => byCode.get(c)).filter(Boolean)
  return found.find((p) => p.status === 'published') ?? found[0] ?? null
}

/** Rows parsed and matched against the database, ready to preview or apply. */
export async function analysePartIds(sheetRows) {
  const db = await getDb()
  const productRows = await db.select({
    id: products.id, code: products.productCode, status: products.status, flex: products.flexAvailable,
  }).from(products)
  const tickRows = await db
    .select({ productId: productAttributes.productId, species: attributeValues.value })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .innerJoin(attributes, and(eq(attributes.id, attributeValues.attributeId), eq(attributes.key, 'species')))
  const current = await db.select({
    partId: productPartIds.partId, productId: productPartIds.productId,
    species: productPartIds.species, name: productPartIds.name, uom: productPartIds.uom,
  }).from(productPartIds)
  return matchPartIds(sheetRows, { productRows, tickRows, current })
}

/** The matching itself, on plain data: products, species ticks and the stored list. */
export function matchPartIds(sheetRows, { productRows, tickRows, current }) {
  const index = productIndex(productRows)
  const ticks = new Set(tickRows.map((t) => `${t.productId}|${t.species}`))

  const matched = []
  const unmatched = []
  const legend = []
  const duplicates = []
  const warnings = { unknownSpecies: new Map(), notTicked: [], archived: [] }
  const seen = new Set()

  for (const r of sheetRows) {
    const partId = r['part id'].toUpperCase()
    // The ERP export ends with a species-code key ("ro | red oak") that has
    // no species, UOM or category: not products.
    if (!r.species && !r.uom && !r.category) { legend.push(`${r['part id']} = ${r.name}`); continue }
    if (seen.has(partId)) { duplicates.push(partId); continue }
    seen.add(partId)

    const { species, known } = normaliseSpecies(r.species)
    const product = matchProduct(partId, r['base code'], index)
    if (!product) { unmatched.push({ partId, name: r.name, species, category: r.category }); continue }

    const row = {
      productId: product.id, code: product.code, partId, species,
      name: r.name || null, uom: r.uom || null, keepName: Boolean(r.keepName),
    }
    matched.push(row)
    if (!known) warnings.unknownSpecies.set(species, (warnings.unknownSpecies.get(species) ?? 0) + 1)
    else if (species === FLEX ? !product.flex : !ticks.has(`${product.id}|${species}`)) {
      warnings.notTicked.push({ partId, code: product.code, species })
    }
    if (product.status === 'archived') warnings.archived.push({ partId, code: product.code })
  }

  // What applying would change, against what is stored now.
  const before = new Map(current.map((c) => [c.partId, c]))
  // The SKU sheet carries no per-part name (its Name column is the product's),
  // so a Part ID coming back from it keeps the ERP name already stored.
  for (const m of matched) if (m.keepName && !m.name) m.name = before.get(m.partId)?.name ?? null
  let added = 0, changed = 0
  for (const m of matched) {
    const b = before.get(m.partId)
    if (!b) added++
    else if (b.productId !== m.productId || b.species !== m.species || b.name !== m.name || b.uom !== m.uom) changed++
  }
  const removed = current.filter((c) => !seen.has(c.partId)).map((c) => c.partId)

  return {
    matched,
    summary: {
      rows: sheetRows.length,
      matched: matched.length,
      products: new Set(matched.map((m) => m.productId)).size,
      unmatched,
      legend,
      duplicates,
      unknownSpecies: [...warnings.unknownSpecies].map(([species, count]) => ({ species, count })),
      notTicked: warnings.notTicked,
      archived: warnings.archived,
      added, changed, removed,
    },
  }
}

/** Replaces every stored Part ID with the matched rows, in one transaction. */
export async function applyPartIds(matched) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await tx.delete(productPartIds)
    for (let i = 0; i < matched.length; i += 200) {
      await tx.insert(productPartIds).values(matched.slice(i, i + 200).map((m) => ({
        productId: m.productId, species: m.species, partId: m.partId, name: m.name, uom: m.uom,
      })))
    }
  })
  return { stored: matched.length }
}

/** A product's Part IDs, grouped by species in the site's species order. */
export async function partIdsForProduct(productId) {
  const db = await getDb()
  const rows = await db.select({ species: productPartIds.species, partId: productPartIds.partId })
    .from(productPartIds).where(eq(productPartIds.productId, productId))
  const order = (s) => { const i = SPECIES.indexOf(s); return i === -1 ? (s === FLEX ? 900 : 999) : i }
  return rows.sort((a, b) => order(a.species) - order(b.species) || a.partId.localeCompare(b.partId))
}
