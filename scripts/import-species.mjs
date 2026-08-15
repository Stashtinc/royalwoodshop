/**
 * Imports the completed species / availability sheet from Royal Wood Shop.
 *
 * Export the "TO DO — Species" tab as CSV to data/species.csv, then:
 *
 *   npm run import:species
 *
 * Safe to run against a partially completed sheet — Brad can send it back in
 * batches and each run picks up whatever has been filled in since.
 */
import { eq, sql } from 'drizzle-orm'
import { connect } from '../src/db/client.mjs'
import { products, attributes, attributeValues, productAttributes } from '../src/db/schema.js'
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { slugify, nonEmpty } from './_lib.mjs'

const SPECIES = [
  'Poplar', 'FJ Primed Poplar', 'FJ Primed Pine', 'Clear Pine', 'Primed MDF',
  'White Oak', 'Red Oak', 'Hard Maple', 'Black Walnut', 'Douglas Fir',
  'Western Red Cedar', 'PVC', 'Steel', 'Plastic',
]

/** Ticked next to species on the sheet, but stored as a product flag — it
 *  describes a variant of the profile, not a material it is milled from. */
const FLEX = 'Flex'

const AVAILABILITY = [
  ['IN STOCK', 'in_stock'],
  ['QUICK SHIP', 'quick_ship'],
  ['SPECIAL ORDER', 'special_order'],
]

const ticked = (v) => String(v ?? '').trim() !== ''

/**
 * Reads the exported sheet, skipping whatever sits above the header row.
 *
 * The workbook carries instructions in the first few rows, so a CSV export
 * does not begin with the headers. Rather than requiring anyone to tidy the
 * file by hand, find the row containing PRODUCT CODE and start there.
 */
function readSheet(file) {
  const text = readFileSync(file, 'utf8')
  const all = parse(text, { skip_empty_lines: false, relax_column_count: true, bom: true })

  const headerIndex = all.findIndex((row) =>
    row.some((cell) => String(cell).trim().toUpperCase() === 'PRODUCT CODE'))
  if (headerIndex === -1) {
    throw new Error('Could not find a PRODUCT CODE column. Is this the "TO DO — Species" tab?')
  }
  if (headerIndex > 0) {
    console.log(`skipped ${headerIndex} row(s) of instructions above the header`)
  }

  const headers = all[headerIndex].map((h) => String(h).trim())
  return all.slice(headerIndex + 1)
    .filter((row) => row.some((c) => String(c).trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
}

export async function run(db, file = 'data/species.csv') {
  const rows = readSheet(file)
  console.log(`read ${rows.length} product rows`)

  const [attr] = await db.insert(attributes)
    .values({ key: 'species', name: 'Wood species', sortOrder: 1 })
    .onConflictDoUpdate({ target: attributes.key, set: { name: 'Wood species' } })
    .returning({ id: attributes.id })

  const valueIds = new Map()
  for (const [i, s] of SPECIES.entries()) {
    const [v] = await db.insert(attributeValues)
      .values({ attributeId: attr.id, slug: slugify(s), value: s, sortOrder: i })
      .onConflictDoUpdate({
        target: [attributeValues.attributeId, attributeValues.slug],
        set: { value: s, sortOrder: i },
      })
      .returning({ id: attributeValues.id })
    valueIds.set(s.toLowerCase(), v.id)
  }

  let matched = 0, notFound = [], noAvail = 0, multiAvail = [], unknown = []
  let withSpeciesTicked = 0, blankRows = 0

  for (const r of rows) {
    const code = nonEmpty(r['PRODUCT CODE'])
    if (!code) continue

    const found = await db.select({ id: products.id }).from(products)
      .where(eq(products.productCode, code)).limit(1)
    if (!found.length) { notFound.push(code); continue }
    const productId = found[0].id

    const chosen = SPECIES.filter((s) => ticked(r[s]))
    if (chosen.length) withSpeciesTicked++
    else if (!ticked(r[FLEX]) && !AVAILABILITY.some(([c]) => ticked(r[c]))) blankRows++
    for (const part of String(r.OTHER ?? '').split('|').map((p) => p.trim()).filter(Boolean)) {
      if (!valueIds.has(part.toLowerCase())) unknown.push(`${code}: ${part}`)
    }

    if (chosen.length) {
      await db.delete(productAttributes).where(eq(productAttributes.productId, productId))
      for (const s of chosen) {
        await db.insert(productAttributes)
          .values({ productId, attributeValueId: valueIds.get(s.toLowerCase()) })
          .onConflictDoNothing()
      }
    }

    const picked = AVAILABILITY.filter(([col]) => ticked(r[col]))
    if (picked.length > 1) multiAvail.push(code)
    if (picked.length === 0) noAvail++

    await db.update(products).set({
      flexAvailable: ticked(r[FLEX]),
      ...(picked.length === 1 ? { availability: picked[0][1] } : {}),
      updatedAt: new Date(),
    }).where(eq(products.id, productId))

    matched++
  }

  const [{ withSpecies }] = await db
    .select({ withSpecies: sql`count(distinct ${productAttributes.productId})::int` })
    .from(productAttributes)
  const [{ withAvail }] = await db.select({ withAvail: sql`count(*)::int` })
    .from(products).where(sql`${products.availability} is not null`)

  console.log(`matched ${matched} products — ${withSpeciesTicked} had species ticked, ${blankRows} rows still blank`)
  console.log(`${withSpecies} products now have species, ${withAvail} have availability`)
  if (notFound.length) console.warn(`product codes not found (${notFound.length}): ${notFound.slice(0, 10).join(', ')}${notFound.length > 10 ? '…' : ''}`)
  if (noAvail) console.warn(`${noAvail} rows have no availability ticked`)
  if (multiAvail.length) console.warn(`more than one availability ticked: ${multiAvail.join(', ')}`)
  if (unknown.length) console.warn(`values in OTHER not on the species list:\n  ${unknown.join('\n  ')}`)
  return { matched, withSpecies, withAvail }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close()
}
