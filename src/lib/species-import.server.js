import { parse } from 'csv-parse/sync'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import {
  products, attributes, attributeValues, productAttributes, speciesImportRuns,
} from '../db/schema.js'
import { SPECIES, TICK_CODES, bestAvailability } from './catalogue-constants.js'

/** Ticked beside species on the sheet, but stored as a product flag. */
const FLEX = 'Flex'
const ticked = (v) => String(v ?? '').trim() !== ''

/** 'X' | 'QS' | 'MTO' -> the stored availability value. */
const CODE = new Map(TICK_CODES.map(([tick, key]) => [tick, key]))
const readCode = (v) => CODE.get(String(v ?? '').trim().toUpperCase()) ?? null

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

/**
 * Turns a sheet row into the change it represents.
 *
 * Each species column carries both facts at once: that the profile is milled
 * in that wood, and how it ships in it. An unrecognised code still counts as
 * a tick — the species is real even when the code is a typo — and is reported
 * so it can be fixed rather than silently dropped.
 */
function readRow(r) {
  const code = String(r['PRODUCT CODE'] ?? '').trim()
  const name = String(r['PRODUCT NAME'] ?? '').trim()
  if (!code && !name) return null

  const species = []
  const badCodes = []
  for (const s of SPECIES) {
    const cell = String(r[s] ?? '').trim()
    if (!cell) continue
    const availability = readCode(cell)
    if (!availability) badCodes.push(`${s}: ${cell}`)
    species.push({ name: s, availability })
  }

  const other = String(r.OTHER ?? '').split('|').map((x) => x.trim()).filter(Boolean)
  return {
    code,
    name,
    species,
    other,
    flex: ticked(r[FLEX]),
    availability: bestAvailability(species.map((x) => x.availability).filter(Boolean)),
    badCodes,
    notes: String(r.NOTES ?? '').trim(),
  }
}

/** The codes the last sheet carried, or null if none has been recorded. */
async function previousCodes(db) {
  const [run] = await db.select({ codes: speciesImportRuns.codes, at: speciesImportRuns.createdAt })
    .from(speciesImportRuns).orderBy(desc(speciesImportRuns.createdAt)).limit(1)
  if (!run) return null
  try { return { codes: new Set(JSON.parse(run.codes)), at: run.at } }
  catch { return null }
}

/**
 * Rows Royal Wood Shop have taken OUT of the sheet since last time.
 *
 * Deliberately not "every product missing from the sheet": the sheet covers
 * 473 of 533 products and never has covered the rest, so absence on its own
 * says nothing. Only a code that was on the previous sheet and is not on this
 * one counts as a removal.
 *
 * Those removals split two ways, and both need saying:
 *
 *   `products`  — a live product sits behind the code, so removing the row is
 *                 a decision about the catalogue and can be acted on.
 *   `orphans`   — no product was ever created for it. Nothing to archive, but
 *                 silence is the wrong answer: the seven KP- knotty pine
 *                 boards left the sheet in the same pass that asked for a
 *                 Knotty Pine column, and nobody would have seen it.
 */
async function findRemoved(db, previous, current) {
  if (!previous) return { products: [], orphans: [] }
  const gone = [...previous.codes].filter((c) => !current.has(c))
  if (!gone.length) return { products: [], orphans: [] }

  const rows = await db
    .select({
      id: products.id,
      code: products.productCode,
      name: products.name,
      status: products.status,
    })
    .from(products)
    .where(inArray(products.productCode, gone))

  const known = new Map(rows.filter((r) => r.code).map((r) => [r.code, r]))
  return {
    // Already-archived products are left out: re-archiving them says nothing.
    products: [...known.values()].filter((r) => r.status === 'published'),
    orphans: gone.filter((c) => !known.has(c)),
  }
}

/**
 * Works out what an import would do, without changing anything.
 * Brad sees this before committing to it.
 */
export async function analyse(rows) {
  const db = await getDb()
  const all = rows.map(readRow).filter(Boolean)
  const parsed = all.filter((p) => p.code)
  // Rows carrying a product name but no product code cannot be matched to
  // anything. They are reported rather than dropped, because on the current
  // sheet there are 66 of them — mostly doors — and silently ignoring a row
  // Royal Wood Shop have filled in is worse than saying so.
  const noCode = all.filter((p) => !p.code).map((p) => p.name)

  const sheetCodes = new Set(parsed.map((p) => p.code))
  const previous = await previousCodes(db)
  const { products: removed, orphans: removedOrphans } = await findRemoved(db, previous, sheetCodes)

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
    noCode,
    /** Rows dropped from the sheet since the last import that have a live
     *  product behind them. Never archived automatically — the preview offers
     *  it and someone has to choose. */
    removed,
    /** Dropped rows with no product behind them: nothing to archive, but they
     *  are still Royal Wood Shop telling us something. */
    removedOrphans,
    hasBaseline: Boolean(previous),
    previousImportAt: previous?.at ?? null,
    sheetCodes: [...sheetCodes],
    badCodes: [],
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
    for (const bad of p.badCodes) summary.badCodes.push(`${p.code} — ${bad}`)
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

/**
 * Records a sheet's codes without writing any species.
 *
 * Needed once: the first real import has nothing to compare against, so the
 * sheet Royal Wood Shop were working from previously is recorded as the
 * baseline and the next import can tell what they have since taken out.
 */
export async function recordBaseline(rows, { fileName = null, userEmail = null } = {}) {
  const db = await getDb()
  const codes = [...new Set(
    rows.map(readRow).filter(Boolean).map((r) => r.code).filter(Boolean),
  )]
  await db.insert(speciesImportRuns).values({
    fileName, userEmail, rowCount: rows.length, matched: 0,
    codes: JSON.stringify(codes), baseline: true,
  })
  return { codes: codes.length, rows: rows.length }
}

/**
 * Applies the import. Returns the same summary shape, plus what was written.
 *
 * `options.archiveMissing` archives the products in `summary.removed`. It is
 * off unless asked for: taking a product off the site is not something a
 * spreadsheet upload should decide on its own.
 */
export async function apply(rows, overrides = {}, options = {}) {
  const { archiveMissing = false, fileName = null, userEmail = null, baseline = false } = options
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
        const vid = valueIds.get(s.name.toLowerCase())
        if (vid) {
          await db.insert(productAttributes)
            .values({ productId: product.id, attributeValueId: vid, availability: s.availability })
            .onConflictDoUpdate({
              target: [productAttributes.productId, productAttributes.attributeValueId],
              set: { availability: s.availability },
            })
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
  const [{ ticksWithAvail }] = await db
    .select({ ticksWithAvail: sql`count(*)::int` })
    .from(productAttributes).where(sql`${productAttributes.availability} is not null`)

  // Archive last, so a failure here cannot lose the species work above.
  let archived = []
  if (archiveMissing && summary.removed.length) {
    const ids = summary.removed.map((r) => r.id)
    await db.update(products)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(inArray(products.id, ids))
    archived = summary.removed
  }

  await db.insert(speciesImportRuns).values({
    fileName,
    userEmail,
    rowCount: summary.rows,
    matched: summary.matched,
    codes: JSON.stringify(summary.sheetCodes),
    archived: archived.length ? JSON.stringify(archived.map((a) => a.code)) : null,
    baseline,
  })

  return { ...summary, written, archived, totals: { withSpecies, withAvail, ticksWithAvail } }
}
