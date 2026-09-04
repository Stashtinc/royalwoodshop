/**
 * Records a species sheet's product codes as the baseline, without importing
 * anything from it.
 *
 * The importer decides what Royal Wood Shop have removed by comparing a sheet
 * against the previous one. The first import has no previous one, so run this
 * against the sheet they were working from before:
 *
 *   npm run import:baseline -- RoyalWoodShop_Phase0_Data_Audit_v9.xlsx
 *
 * Then import the new sheet in /admin/import as usual, and the products whose
 * rows have gone will be listed there.
 */
import { readFileSync } from 'node:fs'
import { connect } from '../src/db/client.mjs'
import { parseUpload, recordBaseline } from '../src/lib/species-import.server.js'

export async function run(_db, file = process.argv[2]) {
  if (!file) {
    console.error('usage: npm run import:baseline -- <sheet.xlsx>')
    process.exit(1)
  }
  const { rows, sheetName, skipped } = await parseUpload(readFileSync(file), file)
  if (skipped) console.log(`skipped ${skipped} instruction row(s) above the header`)
  const r = await recordBaseline(rows, { fileName: file })
  console.log(`baseline recorded from "${sheetName}": ${r.codes} product codes across ${r.rows} rows`)
  console.log('the next import will report anything missing from that list')
  return r
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close()
  process.exit(0)
}
