/**
 * One-off: import species availability from an xlsx workbook.
 *
 *   node scripts/import-species-xlsx.mjs RoyalWoodShop_Phase0_Data_Audit_v10.xlsx
 *
 * Dry-run (analyse only, no writes):
 *   node scripts/import-species-xlsx.mjs RoyalWoodShop_Phase0_Data_Audit_v10.xlsx --dry
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { parseUpload, analyse, apply } from '../src/lib/species-import.server.js'

const file = process.argv[2]
const dry  = process.argv.includes('--dry')

if (!file) {
  console.error('usage: node scripts/import-species-xlsx.mjs <sheet.xlsx> [--dry]')
  process.exit(1)
}

const buf = readFileSync(file)
const { rows, sheetName, skipped, missingColumns } = await parseUpload(buf, file)

if (skipped)                console.log(`skipped ${skipped} instruction row(s) above the header`)
if (missingColumns.length)  console.warn(`columns not in file: ${missingColumns.join(', ')}`)
console.log(`read ${rows.length} product rows from sheet "${sheetName}"`)

const { summary } = await analyse(rows)
console.log(`\npreview:`)
console.log(`  matched:               ${summary.matched}`)
console.log(`  will change:           ${summary.willChange}`)
console.log(`  will set species:      ${summary.willSetSpecies}`)
console.log(`  will set availability: ${summary.willSetAvailability}`)
console.log(`  unmatched codes:       ${summary.unmatched.length}`)
if (summary.badCodes.length) console.warn(`  bad codes: ${summary.badCodes.slice(0, 5).join(', ')}`)
if (summary.noCode.length)   console.warn(`  rows with no product code: ${summary.noCode.length}`)

if (dry) {
  console.log('\n--dry: no changes written.')
  process.exit(0)
}

const r = await apply(rows)
console.log(`\napplied:`)
console.log(`  ${r.written} products updated`)
console.log(`  ${r.totals.withSpecies} products now have species`)
console.log(`  ${r.totals.withAvail} products now have availability`)
console.log(`  ${r.totals.ticksWithAvail} species ticks carry an availability code`)
if (r.unmatched.length) console.warn(`  unmatched: ${r.unmatched.slice(0, 10).join(', ')}`)

console.log('\nRun `npm run sync:data` to refresh products.json, then rebuild.')
process.exit(0)
