/**
 * Records development work in the activity log, from the git history.
 *
 *   npm run log:build            everything not yet recorded
 *   npm run log:build -- --since 2026-08-14
 *
 * The same job is available as a button on the admin log page, which is the
 * safer route while the site is on the embedded database: the button runs
 * inside the server's own process, whereas this script opens the database a
 * second time and will crash a running dev server. Stop the server first, or
 * use the button.
 *
 * The logic lives in src/lib/build-log.server.js so both do the same thing.
 */
import 'dotenv/config'
import { recordBuilds } from '../src/lib/build-log.server.js'

const args = process.argv.slice(2)
const sinceFlag = args.indexOf('--since')
const since = sinceFlag !== -1 ? args[sinceFlag + 1] : null

try {
  const { added, skipped } = await recordBuilds({ since })
  console.log(`\n${added} recorded, ${skipped} already present or skipped as housekeeping.\n`)
  process.exit(0)
} catch (e) {
  console.error(`\n${e.message}\n`)
  process.exit(1)
}
