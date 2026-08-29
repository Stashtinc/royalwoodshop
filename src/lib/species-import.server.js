import { parse } from 'csv-parse/sync'
import { eq, inArray, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { products, attributes, attributeValues, productAttributes } from '../db/schema.js'
import { SPECIES, AVAILABILITY } from './catalogue-constants.js'

/** Ticked beside species on the sheet, but stored as a product flag. */
const FLEX = 'Flex'
const ticked = (v) => String(v ?? '').trim() !== ''

/**
 * Turns a grid of cells into rows, skipping whatever sits above the headers.
 *
 * The workbook carries instructions in its first rows, so neither an export
 * nor the workbook itself begins with headers. Rather than asking anyone to
 * tidy the file, find the row containing PRODUCT CODE and start there.
 */
function parseGrid(all, { sheetName = null } = {}) {
  const headerIndex = all.findIndex((row) =>
    row.some((cell) => String(cell).trim().toUpperCase() === 'PRODUCT CODE'))

  if (headerIndex === -1) {
    throw new Error('No PRODUCT CODE column found. Is this the "TO DO — Species" tab?')
  }

  const headers = all[headerIndex].map((h) => String(h).trim())
  const missingColumns = SPECIES.filter((s) => !headers.includes(s))

  const rows = all.slice(headerIndex + 1)
    .filter((row) => row.some((c) => String(c).trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))

  return { rows, skipped: headerIndex, missingColumns, sheetName }
}

const isZip = (buf) => buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b   // 'PK' — xlsx is a zip

/**
 * Accepts the workbook itself or a CSV export.
 *
 * Brad works in a spreadsheet, so requiring a CSV export first is a step that
 * exists only for the software's convenience. Given an .xlsx, the species tab
 * is found by name.
 */
export async function parseUpload(buffer, fileName = '') {
  const buf = Buffer.from(buffer)

  if (isZip(buf) || /\.xlsx?$/i.test(fileName)) {
    const XLSX = (await import('xlsx')).default
    let book
    try { book = XLSX.read(buf, { type: 'buffer' }) }
    catch { throw new Error('That spreadsheet could not be read. Try File → Download → Comma-separated values instead.') }

    // Prefer the species tab; fall back to any sheet with a PRODUCT CODE column.
    const preferred = book.SheetNames.find((n) => /species/i.test(n))
    const order = preferred ? [preferred, ...book.SheetNames.filter((n) => n !== preferred)] : book.SheetNames

    let lastError
    for (const name of order) {
      const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, blankrows: true, defval: '' })
      try { return parseGrid(grid, { sheetName: name }) }
      catch (e) { lastError = e }
    }
    throw new Error(
      `No sheet in that workbook has a PRODUCT CODE column. Sheets found: ${book.SheetNames.join(', ')}.`,
    )
  }

  let text
  try { text = new TextDecoder('utf-8', { fatal: false }).decode(buf) }
  catch { throw new Error('That file could not be read.') }

  const grid = parse(text, { skip_empty_lines: false, relax_column_count: true, bom: true })
  return parseGrid(grid)
}

/** CSV only — used by the command-line importer. */
export function parseSheet(text) {
  return parseGrid(parse(text, { skip_empty_lines: false, relax_column_count: true, bom: true }))
}

/** Turns a sheet row into the change it represents. */
function readRow(r) {
  const code = String(r['PRODUCT CODE'] ?? '').trim()
  if (!code) return null
  const species = SPECIES.filter((s) => ticked(r[s]))
  // AVAILABILITY is [key, label]; the sheet's column header is the label in
  // capitals — 'in_stock' is the stored value, 'IN STOCK' is the column.
  const picked = AVAILABILITY.filter(([, label]) => ticked(r[label.toUpperCase()]))
  const other = String(r.OTHER ?? '').split('|').map((s) => s.trim()).filter(Boolean)
  return {
    code,
    name: String(r['PRODUCT NAME'] ?? '').trim(),
    species,
    other,
    flex: ticked(r[FLEX]),
    availability: picked.length === 1 ? picked[0][0] : null,
    tooManyAvailability: picked.length > 1,
    notes: String(r.NOTES ?? '').trim(),
  }
}

/**
 * Works out what an import would do, without changing anything.
 * Brad sees this before committing to it.
 */
export async function analyse(rows) {
  const db = await getDb()
  const parsed = rows.map(readRow).filter(Boolean)

  const codes = [...new Set(parsed.map((p) => p.code))]
  const found = codes.length
    ? await db.select({ id: products.id, productCode: products.productCode, name: products.name })
        .from(products).where(inArray(products.productCode, codes))
    : []
  const byCode = new Map(found.map((f) => [f.productCode, f]))

  const known = new Set(SPECIES.map((s) => s.toLowerCase()))
  const summary = {
    rows: parsed.length,
    matched: 0,
    willChange: 0,
    unmatched: [],
    willSetSpecies: 0,
    willSetAvailability: 0,
    willSetFlex: 0,
    blank: 0,
    tooManyAvailability: [],
    unknownOther: [],
    changes: [],
  }

  for (const p of parsed) {
    const product = byCode.get(p.code)
    if (!product) { summary.unmatched.push(p.code); continue }
    summary.matched++

    if (p.species.length) summary.willSetSpecies++
    if (p.availability) summary.willSetAvailability++
    if (p.flex) summary.willSetFlex++
    if (p.species.length || p.availability || p.flex) summary.willChange++
    else summary.blank++
    if (p.tooManyAvailability) summary.tooManyAvailability.push(p.code)
    for (const o of p.other) {
      if (!known.has(o.toLowerCase())) summary.unknownOther.push(`${p.code}: ${o}`)
    }

    if (summary.changes.length < 40 && (p.species.length || p.availability || p.flex)) {
      summary.changes.push({
        code: p.code,
        name: product.name,
        species: p.species,
        availability: p.availability,
        flex: p.flex,
      })
    }
  }

  return { summary, parsed, byCode }
}

/** Applies the import. Returns the same summary shape, plus what was written. */
export async function apply(rows, overrides = {}) {
  const db = await getDb()
  const { summary, parsed: base, byCode } = await analyse(rows)

  // Merge any manual corrections made in the preview UI before writing.
  const parsed = base.map((p) => {
    const o = overrides[p.code]
    if (!o) return p
    return {
      ...p,
      ...(Array.isArray(o.species) && { species: o.species }),
      ...(typeof o.flex === 'boolean' && { flex: o.flex }),
      ...(('availability' in o) && { availability: o.availability }),
    }
  })

  const [attr] = await db.insert(attributes)
    .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
    .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
    .returning({ id: attributes.id })

  const valueIds = new Map()
  for (const [i, s] of SPECIES.entries()) {
    const [v] = await db.insert(attributeValues)
      .values({ attributeId: attr.id, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'), value: s, sortOrder: i })
      .onConflictDoUpdate({
        target: [attributeValues.attributeId, attributeValues.slug],
        set: { value: s, sortOrder: i },
      })
      .returning({ id: attributeValues.id })
    valueIds.set(s.toLowerCase(), v.id)
  }

  let written = 0
  for (const p of parsed) {
    const product = byCode.get(p.code)
    if (!product) continue

    // A row with nothing ticked is untouched rather than treated as "clear it".
    if (!p.species.length && !p.availability && !p.flex) continue

    if (p.species.length) {
      await db.delete(productAttributes).where(eq(productAttributes.productId, product.id))
      for (const s of p.species) {
        const vid = valueIds.get(s.toLowerCase())
        if (vid) {
          await db.insert(productAttributes)
            .values({ productId: product.id, attributeValueId: vid }).onConflictDoNothing()
        }
      }
    }

    await db.update(products).set({
      flexAvailable: p.flex,
      ...(p.availability ? { availability: p.availability } : {}),
      updatedAt: new Date(),
    }).where(eq(products.id, product.id))

    written++
  }

  const [{ withSpecies }] = await db
    .select({ withSpecies: sql`count(distinct ${productAttributes.productId})::int` })
    .from(productAttributes)
  const [{ withAvail }] = await db.select({ withAvail: sql`count(*)::int` })
    .from(products).where(sql`${products.availability} is not null`)

  return { ...summary, written, totals: { withSpecies, withAvail } }
}
