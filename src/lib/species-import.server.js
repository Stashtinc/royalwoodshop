import { parse } from 'csv-parse/sync'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { getDb } from './db.server.js'
import {
  products, attributes, attributeValues, productAttributes, speciesImportRuns,
  categories, productCategories, productImages,
} from '../db/schema.js'
import { SPECIES, TICK_CODES, TICK_ALIASES, bestAvailability } from './catalogue-constants.js'

/** Ticked beside species on the sheet, but stored as a product flag. */
const FLEX = 'Flex'
const ticked = (v) => String(v ?? '').trim() !== ''

/** 'X' | 'QS' | 'MTO' -> the stored availability value. */
const CODE = new Map([...TICK_CODES, ...Object.entries(TICK_ALIASES)])
const readCode = (v) => CODE.get(String(v ?? '').trim().toUpperCase()) ?? null

/**
 * Turns a grid of cells into rows, skipping whatever sits above the headers.
 *
 * The workbook carries instructions in its first rows, so neither an export
 * nor the workbook itself begins with headers. Rather than asking anyone to
 * tidy the file, find the row containing PRODUCT CODE and start there.
 */
/** Headers are typed by hand and wrap across lines — 'Product\n Name' and
 *  'Product Name' are the same column. Compare them flattened. */
export const canon = (h) => String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

const CODE_HEADERS = ['product code', 'code']

function parseGrid(all, { sheetName = null } = {}) {
  const headerIndex = all.findIndex((row) =>
    row.some((cell) => CODE_HEADERS.includes(canon(cell))))

  if (headerIndex === -1) {
    throw new Error(
      'No product code column found. Expected either a "Code" column '
      + '(Master Product List) or a "PRODUCT CODE" column (species sheet).',
    )
  }

  const raw = all[headerIndex].map((h) => String(h ?? '').trim())
  const keys = raw.map(canon)

  // The Master Product List carries the whole product record; the species
  // sheet carries only the wood grid. Which one decides how much an import
  // is allowed to write.
  const layout = keys.includes('code') && !keys.includes('product code') ? 'master' : 'species'

  const missingColumns = SPECIES.filter((sp) => !keys.includes(canon(sp)))

  const rows = all.slice(headerIndex + 1)
    .filter((row) => row.some((c) => String(c ?? '').trim() !== ''))
    .map((row) => Object.fromEntries(keys.map((k, i) => [k, row[i] ?? ''])))

  return { rows, skipped: headerIndex, missingColumns, sheetName, layout }
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
const cell = (r, key) => String(r[key] ?? '').trim()

/** SPECIES names by lowercase, so "knotty Pine" typed in OTHER resolves to the
 *  Knotty Pine column rather than becoming a second, differently-cased value. */
const SPECIES_BY_LOWER = new Map(SPECIES.map((s) => [s.toLowerCase(), s]))

/**
 * The species a row asserts: the ticked columns, plus anything in OTHER that
 * is not already one of them. An OTHER value naming a real column is folded
 * into that column — otherwise the same wood exists twice under two spellings
 * and no import ever settles.
 */
function speciesOf(p) {
  const out = [...p.species]
  const have = new Set(out.map((x) => x.name.toLowerCase()))
  for (const raw of p.other) {
    const key = raw.toLowerCase()
    if (have.has(key)) continue
    have.add(key)
    out.push({ name: SPECIES_BY_LOWER.get(key) ?? raw, availability: null })
  }
  return out
}
const pipes = (v) => String(v ?? '').split('|').map((x) => x.trim()).filter(Boolean)

function readRow(r, layout = 'species') {
  const code = cell(r, layout === 'master' ? 'code' : 'product code')
  const name = cell(r, layout === 'master' ? 'product name' : 'product name')
  if (!code && !name) return null

  const species = []
  const badCodes = []
  for (const s of SPECIES) {
    const v = cell(r, canon(s))
    if (!v) continue
    const availability = readCode(v)
    if (!availability) badCodes.push(`${s}: ${v}`)
    species.push({ name: s, availability })
  }

  const flexCell = cell(r, canon(FLEX))
  const row = {
    code,
    name,
    species,
    other: pipes(r.other),
    flex: flexCell !== '',
    availability: bestAvailability(species.map((x) => x.availability).filter(Boolean)),
    badCodes,
    notes: cell(r, 'notes'),
  }

  if (layout !== 'master') return row

  // Fields only the Master Product List carries. An empty cell means "leave
  // what is there alone" — it never clears a value that is already set.
  const uomKey = Object.keys(r).find((k) => k.startsWith('uom'))
  const priceRaw = cell(r, 'price').replace(/[$,]/g, '')
  const price = priceRaw && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null

  row.fields = {
    name: name || null,
    description: cell(r, 'description') || null,
    sizeDisplay: cell(r, 'size') || null,
    price,
    uom: (uomKey ? cell(r, uomKey) : '') || null,
  }
  row.images = pipes(r['image name'])

  // Category and sub-category pair up by position, so one product can be
  // Decorative under Trim & Mouldings and Sheet Panels under Sheet Goods:
  //   Category      TRIM & MOULDINGS|SHEET GOODS
  //   type/sub-cat  Decorative|Sheet Panels
  // The first pair is canonical — it is the address the product lives at.
  const cats = pipes(r.category)
  const subs = pipes(r['type sub-cat'] || r.subcategory)
  row.categories = cats
  row.category = cats[0] || null
  row.subcategories = subs
  row.placements = subs.map((sub, i) => ({ category: cats[i] ?? cats[cats.length - 1] ?? null, sub }))
  // More sub-categories than categories is ambiguous; the extras are attached
  // to the last category named and reported rather than guessed at silently.
  row.unpairedSubs = cats.length > 1 && subs.length > cats.length
    ? subs.slice(cats.length)
    : []
  // The sheet's Availability column is a roll-up of the wood codes; a value
  // typed over it wins, because that is the point of being able to type over it.
  row.availability = readCode(cell(r, 'availability')) || row.availability
  return row
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
/**
 * What is actually in public/uploads, so a sheet can be imported without
 * fetching anything: the Master Product List names real files, and this is how
 * we check they are there and how wide they are.
 *
 * A base image is `<stem>-<10 hex>.webp`; its generated widths sit beside it as
 * `<stem>-<10 hex>-<width>.webp`. The largest width present becomes the image's
 * width, so srcset never offers a variant that was never generated.
 */
let uploadIndex = null
async function readUploads() {
  if (uploadIndex) return uploadIndex
  const { readdir } = await import('node:fs/promises')
  const widths = new Map()
  let names = []
  try { names = await readdir('public/uploads') } catch { /* nothing to attach */ }
  for (const f of names) {
    const m = f.match(/^(.*-[0-9a-f]{10})-(\d+)\.webp$/)
    if (!m) continue
    const base = `${m[1]}.webp`
    widths.set(base, Math.max(widths.get(base) ?? 0, Number(m[2])))
  }
  uploadIndex = { files: new Set(names), widths }
  return uploadIndex
}

const imageRole = (name) =>
  /(^|[^a-z0-9])3d([^a-z0-9]|$)|profile/i.test(name) ? 'profile_drawing'
    : /install/i.test(name) ? 'installed_photo'
      : 'product_photo'

/**
 * Category names on the sheet are shouted — TRIM & MOULDINGS — because that is
 * how the list reads. The catalogue stores them in sentence case, so the two
 * are mapped here rather than letting an import shout a category's name at the
 * rest of the site.
 *
 * `siteKnows` marks the slugs the public catalogue can actually render. The
 * sheet also carries S4S Flat Stock and Sheet Goods, which the site's menu does
 * not have yet; products land there correctly but the mismatch is reported.
 */
const CATEGORY_DEFS = [
  ['trim-mouldings',          'Trim & Moulding',         ['TRIM AND MOULDINGS', 'TRIM & MOULDINGS', 'TRIM AND MOULDING'], true],
  ['flat-stock-lumber',       'Flat Stock Lumber',        ['FLAT STOCK LUMBER', 'FLAT STOCK', 'S4S FLAT STOCK'],          true],
  ['interior-doors',          'Interior Doors',           [],                                                              true],
  ['door-hardware',           'Door Hardware',            [],                                                              true],
  ['wall-ceiling-panelling',  'Wall & Ceiling Panelling', ['PANELLING'],                                                   true],
  ['stair-railing',           'Stair & Railing',          ['STAIRS & RAILINGS', 'STAIR RAILING', 'STAIRS AND RAILINGS'],  true],
  ['stair-components',        'Stair Components',         [],                                                              true],
  ['sheet-stock',             'Sheet Stock',              ['SHEET GOODS'],                                                 true],
  ['siding',                  'Exterior Siding',          ['SIDING', 'EXTERIOR SIDING'],                                  true],
  ['aria-fittes-floor-vents', 'Aria Fittes Floor Vents',  ['ARIA FITTES', 'ARIA FITTES FLOOR VENTS'],                     true],
]
const CATEGORY_SLUG = {}
const CATEGORY_TITLE = {}
const SITE_KNOWS = new Set()
for (const [slug, title, aliases, known] of CATEGORY_DEFS) {
  CATEGORY_TITLE[slug] = title
  if (known) SITE_KNOWS.add(slug)
  for (const key of [title.toUpperCase(), slug.toUpperCase(), ...aliases]) CATEGORY_SLUG[key] = slug
}
const categorySlug = (name) => CATEGORY_SLUG[String(name ?? '').trim().toUpperCase()] ?? null
const categoryTitle = (name) => CATEGORY_TITLE[categorySlug(name)] ?? String(name ?? '').trim()

/** Which of the extra columns differ from what the database already holds.
 *  A blank cell is "leave it alone" and never appears here. */
function fieldDiff(sheet, current) {
  const out = {}
  for (const [k, v] of Object.entries(sheet ?? {})) {
    if (v === null || v === '') continue
    const now = current?.[k]
    const same = k === 'price'
      ? Number(now ?? NaN) === Number(v)
      : String(now ?? '').trim() === String(v).trim()
    if (!same) out[k] = { from: now ?? null, to: v }
  }
  return out
}

export async function analyse(rows, { layout = 'species' } = {}) {
  const db = await getDb()
  const all = rows.map((r) => readRow(r, layout)).filter(Boolean)
  let parsed = all.filter((p) => p.code)
  // Rows carrying a product name but no product code cannot be matched to
  // anything. They are reported rather than dropped, because on the current
  // sheet there are 66 of them — mostly doors — and silently ignoring a row
  // Royal Wood Shop have filled in is worse than saying so.
  const noCode = all.filter((p) => !p.code).map((p) => p.name)

  // Two rows sharing a product code make the import non-deterministic — each
  // pass writes one row's values over the other's. Only the first is applied,
  // and the clash is reported so the sheet can be fixed.
  const seen = new Set()
  const duplicateCodes = []
  const deduped = []
  for (const row of parsed) {
    if (seen.has(row.code)) { duplicateCodes.push(row.code); continue }
    seen.add(row.code)
    deduped.push(row)
  }
  parsed = deduped

  const uploads = layout === 'master'
    ? await readUploads()
    : { files: new Set(), widths: new Map() }

  const sheetCodes = new Set(parsed.map((p) => p.code))
  const previous = await previousCodes(db)
  const { products: removed, orphans: removedOrphans } = await findRemoved(db, previous, sheetCodes)

  const codes = [...new Set(parsed.map((p) => p.code))]
  const found = codes.length
    ? await db.select({
        id: products.id,
        productCode: products.productCode,
        name: products.name,
        description: products.description,
        sizeDisplay: products.sizeDisplay,
        price: products.price,
        uom: products.uom,
        primaryCategoryId: products.primaryCategoryId,
        categorySlug: categories.slug,
        availability: products.availability,
        flexAvailable: products.flexAvailable,
      }).from(products)
        .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
        .where(inArray(products.productCode, codes))
    : []
  const byCode = new Map(found.map((f) => [f.productCode, f]))

  // Fetch current per-species availability for all matched products so we can
  // detect whether the sheet would actually change anything.
  const productIds = found.map((f) => f.id)
  const currentAttrs = productIds.length
    ? await db.select({
        productId: productAttributes.productId,
        speciesName: attributeValues.value,
        availability: productAttributes.availability,
      })
      .from(productAttributes)
      .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
      .innerJoin(
        attributes,
        and(eq(attributes.id, attributeValues.attributeId), eq(attributes.key, 'species')),
      )
      .where(inArray(productAttributes.productId, productIds))
    : []

  const currentImagesById = new Map()
  if (layout === 'master' && productIds.length) {
    const rows_ = await db
      .select({ productId: productImages.productId, key: productImages.storageKey,
                sortOrder: productImages.sortOrder, id: productImages.id })
      .from(productImages).where(inArray(productImages.productId, productIds))
    rows_.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    for (const row of rows_) {
      if (!currentImagesById.has(row.productId)) currentImagesById.set(row.productId, [])
      currentImagesById.get(row.productId).push(row.key)
    }
  }

  // Compared as "<parent slug>::<sub>", because moving a sub from one category
  // to another is a change even when the sub keeps its name.
  const currentSubsById = new Map()
  if (layout === 'master' && productIds.length) {
    const parent = alias(categories, 'parent_cat')
    const rows_ = await db
      .select({ productId: productCategories.productId, name: categories.name, parentSlug: parent.slug })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .innerJoin(parent, eq(parent.id, categories.parentId))
      .where(inArray(productCategories.productId, productIds))
    for (const row of rows_) {
      if (!currentSubsById.has(row.productId)) currentSubsById.set(row.productId, [])
      currentSubsById.get(row.productId).push(`${row.parentSlug}::${row.name}`)
    }
  }
  const sameSubs = (a, b) =>
    [...a].sort().join('|') === [...b].sort().join('|')

  const currentSpeciesById = new Map()
  for (const row of currentAttrs) {
    if (!currentSpeciesById.has(row.productId)) currentSpeciesById.set(row.productId, [])
    currentSpeciesById.get(row.productId).push({ name: row.speciesName, availability: row.availability })
  }

  // Compared case-insensitively: the stored value keeps whatever casing the
  // catalogue already uses, and a difference of case is not a change.
  const speciesKey = (arr) =>
    [...arr].map((x) => ({ name: x.name.toLowerCase(), availability: x.availability }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => `${x.name}:${x.availability ?? ''}`).join('|')

  const known = new Set(SPECIES.map((s) => s.toLowerCase()))
  const summary = {
    rows: parsed.length,
    matched: 0,
    willChange: 0,
    alreadyCorrect: 0,
    willCreate: [],
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
    layout,
    /** Field-level edits the Master Product List would make. */
    fieldChanges: [],
    willSetFields: 0,
    /** Products the sheet would move to a different top-level category. That
     *  changes the product's address, so it is opt-in rather than automatic. */
    categoryMoves: [],
    unknownCategories: [],
    /** Codes appearing on more than one sheet row. Only the first is imported. */
    duplicateCodes: [...new Set(duplicateCodes)],
    /** Image files the sheet names that are not in public/uploads. */
    missingImages: [],
    willSetImages: 0,
    /** Sub-categories with no category of their own to pair with. */
    unpairedSubs: [],
    /** Categories the sheet uses that the public catalogue has no page for. */
    offMenuCategories: [],
  }

  for (const p of parsed) {
    const allSpecies = speciesOf(p)

    // Resolved before the match check: a row that creates a product needs its
    // images just as much as one that updates an existing product.
    p.imageFiles = (p.images ?? []).filter((f) => uploads.files.has(f))
    for (const f of (p.images ?? [])) {
      if (!uploads.files.has(f) && summary.missingImages.length < 40) {
        summary.missingImages.push(`${p.code}: ${f}`)
      }
    }
    const sheetHasContent = layout === 'master'
      && (Object.values(p.fields ?? {}).some((v) => v !== null && v !== '')
          || (p.subcategories?.length ?? 0) > 0
          || p.imageFiles.length > 0)

    for (const bad of p.badCodes) summary.badCodes.push(`${p.code} — ${bad}`)
    for (const o of p.other) {
      if (!known.has(o.toLowerCase())) summary.unknownOther.push(`${p.code}: ${o}`)
    }

    const product = byCode.get(p.code)

    if (!product) {
      // Code not in the DB yet — create it on apply if it has anything to write.
      // On the Master Product List that includes a name, a description or an
      // image, not just a ticked wood.
      if (allSpecies.length || p.availability || p.flex || sheetHasContent) {
        summary.willCreate.push({
          code: p.code,
          name: p.name || p.code,
          species: allSpecies,
          availability: p.availability,
          flex: p.flex,
        })
        if (p.imageFiles.length) summary.willSetImages++
      } else {
        summary.unmatched.push(p.code)
      }
      continue
    }

    summary.matched++

    // The Master Product List carries the whole record, so a row can be worth
    // importing on its description or price alone, with no wood ticked.
    let fields = {}
    if (layout === 'master') {
      fields = fieldDiff(p.fields, product)
      if (Object.keys(fields).length) {
        summary.willSetFields++
        if (summary.fieldChanges.length < 60) {
          summary.fieldChanges.push({ code: p.code, name: product.name, fields })
        }
      }
      for (const c of (p.categories ?? [])) {
        const slug = categorySlug(c)
        if (!slug) summary.unknownCategories.push(`${p.code}: ${c}`)
        else if (!SITE_KNOWS.has(slug)) summary.offMenuCategories.push(`${p.code}: ${c}`)
      }
      for (const sub of (p.unpairedSubs ?? [])) {
        summary.unpairedSubs.push(`${p.code}: "${sub}" -> ${p.categories[p.categories.length - 1]}`)
      }
      if (p.category) {
        const slug = categorySlug(p.category)
        if (slug && product.categorySlug && slug !== product.categorySlug) {
          summary.categoryMoves.push({
            code: p.code, name: product.name, from: product.categorySlug, to: slug,
          })
        }
      }
    }
    const wantedPlacements = (p.placements ?? [])
      .map((x) => `${categorySlug(x.category) ?? product.categorySlug}::${x.sub}`)
    const subsWouldChange = wantedPlacements.length > 0
      && !sameSubs(wantedPlacements, currentSubsById.get(product.id) ?? [])

    const present = p.imageFiles
    const imagesWouldChange = present.length > 0
      && present.map((f) => `/uploads/${f}`).join('|') !== (currentImagesById.get(product.id) ?? []).join('|')
    if (imagesWouldChange) summary.willSetImages++

    const hasFieldWork = Object.keys(fields).length > 0 || subsWouldChange || imagesWouldChange

    // Nothing ticked at all — apply skips these rows too
    if (!allSpecies.length && !p.availability && !p.flex && !hasFieldWork) {
      summary.blank++
      continue
    }

    // Compare incoming data to what is already in the DB
    const currentSpecies = currentSpeciesById.get(product.id) ?? []
    const speciesWouldChange = allSpecies.length > 0
      && speciesKey(allSpecies) !== speciesKey(currentSpecies)
    const flexWouldChange = p.flex !== Boolean(product.flexAvailable)
    const availWouldChange = Boolean(p.availability) && p.availability !== product.availability

    if (!speciesWouldChange && !flexWouldChange && !availWouldChange && !hasFieldWork) {
      summary.alreadyCorrect++
      continue
    }

    summary.willChange++
    if (allSpecies.length) summary.willSetSpecies++
    if (p.availability) summary.willSetAvailability++
    if (p.flex) summary.willSetFlex++

    if (summary.changes.length < 40) {
      summary.changes.push({
        code: p.code,
        name: product.name,
        species: allSpecies,
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
  const {
    archiveMissing = false, fileName = null, userEmail = null, baseline = false,
    layout = 'species', moveCategories = false,
  } = options
  const db = await getDb()
  const { summary, parsed: base, byCode } = await analyse(rows, { layout })
  const uploads = layout === 'master' ? await readUploads() : { files: new Set(), widths: new Map() }

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

  // Create new products (as drafts) for codes that have species data but no DB record.
  let created = 0
  for (const p of parsed) {
    if (byCode.has(p.code)) continue
    const allSpecies = speciesOf(p)
    const sheetHasContent = layout === 'master'
      && (Object.values(p.fields ?? {}).some((v) => v !== null && v !== '')
          || (p.subcategories?.length ?? 0) > 0
          || (p.imageFiles?.length ?? 0) > 0)
    if (!allSpecies.length && !p.availability && !p.flex && !sheetHasContent) continue

    const slug = p.code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    // Without a category a new draft has no parent to hang sub-categories
    // from, and no address — so take the one the sheet names.
    let primaryCategoryId = null
    const wantedSlug = layout === 'master' ? categorySlug(p.category) : null
    if (wantedSlug) {
      const [top] = await db.insert(categories)
        .values({ slug: wantedSlug, name: categoryTitle(p.category) })
        .onConflictDoUpdate({ target: categories.slug, set: { updatedAt: new Date() } })
        .returning({ id: categories.id })
      primaryCategoryId = top.id
    }

    const [row] = await db.insert(products)
      .values({
        slug, productCode: p.code, name: p.name || p.code, status: 'draft',
        flexAvailable: false, ...(primaryCategoryId ? { primaryCategoryId } : {}),
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: { productCode: p.code, updatedAt: new Date(), ...(primaryCategoryId ? { primaryCategoryId } : {}) },
      })
      .returning({
        id: products.id, productCode: products.productCode, name: products.name,
        primaryCategoryId: products.primaryCategoryId,
        availability: products.availability, flexAvailable: products.flexAvailable,
      })
    byCode.set(p.code, row)
    created++
  }
  summary.created = created

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

  let written = 0, subcategorised = 0, imaged = 0
  const moved = []
  for (const p of parsed) {
    const product = byCode.get(p.code)
    if (!product) continue

    // A row with nothing ticked is untouched rather than treated as "clear it" —
    // unless the Master Product List brings other fields with it.
    const allSpecies = speciesOf(p)
    const hasFieldWork = layout === 'master'
      && (Object.values(p.fields ?? {}).some((v) => v !== null && v !== '')
          || (p.subcategories?.length ?? 0) > 0
          || (p.imageFiles?.length ?? 0) > 0)
    // `parsed` is already de-duplicated by code in analyse(), so each product
    // is written once per run and the result does not depend on row order.
    if (!allSpecies.length && !p.availability && !p.flex && !hasFieldWork) continue

    if (allSpecies.length) {
      await db.delete(productAttributes).where(eq(productAttributes.productId, product.id))
      for (const s of allSpecies) {
        let vid = valueIds.get(s.name.toLowerCase())
        if (!vid) {
          // OTHER column: free-text species not in the named columns — create on the fly
          const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          const [v] = await db.insert(attributeValues)
            .values({ attributeId: attr.id, slug, value: s.name, sortOrder: 999 })
            .onConflictDoUpdate({
              target: [attributeValues.attributeId, attributeValues.slug],
              set: { value: s.name },
            })
            .returning({ id: attributeValues.id })
          vid = v.id
          valueIds.set(s.name.toLowerCase(), vid)
        }
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

    const patch = {
      flexAvailable: p.flex,
      ...(p.availability ? { availability: p.availability } : {}),
      updatedAt: new Date(),
    }

    if (layout === 'master') {
      // Sheet wins where it has a value; a blank cell leaves the field alone.
      for (const [k, v] of Object.entries(p.fields ?? {})) {
        if (v !== null && v !== '') patch[k] = v
      }

      const wanted = categorySlug(p.category)
      let parentId = product.primaryCategoryId

      // No category yet: filling a blank is not a move, so it needs no opt-in.
      if (wanted && !product.categorySlug && !parentId) {
        const [top] = await db.insert(categories)
          .values({ slug: wanted, name: categoryTitle(p.category) })
          .onConflictDoUpdate({ target: categories.slug, set: { updatedAt: new Date() } })
          .returning({ id: categories.id })
        parentId = top.id
        patch.primaryCategoryId = top.id
      }

      if (wanted && product.categorySlug && wanted !== product.categorySlug && moveCategories) {
        const [top] = await db.insert(categories)
          .values({ slug: wanted, name: categoryTitle(p.category) })
          .onConflictDoUpdate({ target: categories.slug, set: { updatedAt: new Date() } })
          .returning({ id: categories.id })
        parentId = top.id
        patch.primaryCategoryId = top.id
        moved.push({ code: p.code, from: product.categorySlug, to: wanted })
      }

      // Images come from files already on disk — the sheet names them, nothing
      // is fetched. Replaced wholesale when the sheet names any, so the sheet
      // decides the set and the order; left alone when it names none.
      if (p.imageFiles?.length) {
        const keys = p.imageFiles.map((f) => `/uploads/${f}`)
        const existing = await db
          .select({ key: productImages.storageKey, alt: productImages.altText, role: productImages.role })
          .from(productImages).where(eq(productImages.productId, product.id))
        const wasSet = new Map(existing.map((e) => [e.key, e]))

        await db.delete(productImages).where(eq(productImages.productId, product.id))
        for (const [i, key] of keys.entries()) {
          const file = p.imageFiles[i]
          await db.insert(productImages).values({
            productId: product.id,
            storageKey: key,
            // alt_text is required; keep what was written for this image if we
            // had it, otherwise the product name is a truthful starting point.
            // Alt text and role are editorial: guessing from a file name is a
            // starting point, never a reason to overwrite what someone chose.
            altText: wasSet.get(key)?.alt || patch.name || product.name || p.code,
            width: uploads.widths.get(file) ?? null,
            role: wasSet.get(key)?.role ?? imageRole(file),
            sortOrder: i,
          })
        }
        imaged++
      }

      // Placements are facets, not addresses — rewritten whenever the sheet
      // names any. Each sub is created under ITS OWN category, so a product in
      // two categories files correctly under both. The address does not move.
      if (p.placements?.length) {
        const wantedIds = []
        for (const { category, sub } of p.placements) {
          const topSlug = categorySlug(category) ?? wanted ?? product.categorySlug
          if (!topSlug) continue
          const [top] = await db.insert(categories)
            .values({ slug: topSlug, name: categoryTitle(category ?? p.category) })
            .onConflictDoUpdate({ target: categories.slug, set: { updatedAt: new Date() } })
            .returning({ id: categories.id })
          const childSlug = `${topSlug}-${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          const [child] = await db.insert(categories)
            .values({ slug: childSlug, name: sub, parentId: top.id })
            .onConflictDoUpdate({
              target: categories.slug,
              set: { name: sub, parentId: top.id, updatedAt: new Date() },
            })
            .returning({ id: categories.id })
          wantedIds.push(top.id, child.id)
        }
        if (parentId) wantedIds.push(parentId)

        const keep = new Set(wantedIds)
        const existing = await db.select({ categoryId: productCategories.categoryId })
          .from(productCategories).where(eq(productCategories.productId, product.id))
        for (const row of existing) {
          if (!keep.has(row.categoryId)) {
            await db.delete(productCategories).where(and(
              eq(productCategories.productId, product.id),
              eq(productCategories.categoryId, row.categoryId),
            ))
          }
        }
        for (const cid of keep) {
          await db.insert(productCategories)
            .values({ productId: product.id, categoryId: cid }).onConflictDoNothing()
        }
        subcategorised++
      }
    }

    await db.update(products).set(patch).where(eq(products.id, product.id))

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

  return {
    ...summary, written, archived, moved, subcategorised, imaged,
    totals: { withSpecies, withAvail, ticksWithAvail },
  }
}
