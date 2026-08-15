/**
 * Command-line version of the admin's Import screen.
 *
 * Brad uses /admin/import; this exists for scripted or bulk runs.
 *
 *   npm run import:species            # reads data/species.csv
 */
import { readFileSync } from 'node:fs'
import { connect } from '../src/db/client.mjs'
import { parseSheet, apply } from '../src/lib/species-import.server.js'

export async function run(_db, file = 'data/species.csv') {
  const { rows, skipped, missingColumns } = parseSheet(readFileSync(file, 'utf8'))
  if (skipped) console.log(`skipped ${skipped} instruction row(s) above the header`)
  if (missingColumns.length) console.warn(`columns not in the file: ${missingColumns.join(', ')}`)
  console.log(`read ${rows.length} product rows`)

  const r = await apply(rows)
  console.log(`updated ${r.written} products`)
  console.log(`${r.totals.withSpecies} products now have species, ${r.totals.withAvail} have availability`)
  if (r.unmatched.length) console.warn(`codes not found (${r.unmatched.length}): ${r.unmatched.slice(0, 10).join(', ')}`)
  if (r.blank) console.warn(`${r.blank} rows had nothing ticked and were left alone`)
  if (r.unknownOther.length) console.warn(`unrecognised OTHER values:\n  ${r.unknownOther.join('\n  ')}`)
  return r
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close()
  process.exit(0)
}
