/**
 * Creates the tables and loads the catalogue. Works with or without a server.
 *
 *   npm run db:setup
 *
 * With no DATABASE_URL this builds an embedded Postgres in .data/pg — nothing
 * to install. Set DATABASE_URL later and run the same command against a real
 * server; the schema is identical.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { getDb } from '../src/lib/db.server.js'
import { sql } from 'drizzle-orm'
import { run as importProducts } from './import-products.mjs'
import { run as importRedirects } from './import-redirects.mjs'

const db = await getDb()
const embedded = db.$mode === 'embedded'
console.log(`database: ${embedded ? 'embedded Postgres (.data/pg)' : 'PostgreSQL via DATABASE_URL'}`)
if (embedded) {
  console.log('note: the embedded database is single-writer — stop the dev server before running this\n')
} else {
  console.log('')
}

const files = readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()
if (!files.length) { console.error('no migration files in drizzle/'); process.exit(1) }

let applied = 0, skipped = 0
for (const file of files) {
  for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (!s) continue
    try { await db.execute(sql.raw(s)); applied++ }
    catch (e) {
      // Re-running setup is expected; only genuine failures should stop it.
      const msg = `${e.message} ${e.cause?.message ?? ''}`
      if (/already exists|duplicate/i.test(msg)) { skipped++; continue }
      console.error(`\nfailed in ${file}:\n  ${s.slice(0, 120)}\n  ${e.cause?.message ?? e.message}\n`)
      throw e
    }
  }
}
console.log(`schema: ${files.length} migration(s), ${applied} applied, ${skipped} already present`)

// Confirm the tables are actually there. Reporting success without checking is
// how a missing table reaches a page instead of this script.
const EXPECTED = [
  'categories', 'products', 'product_categories', 'attributes', 'attribute_values',
  'product_attributes', 'product_images', 'related_products', 'redirects',
  'not_found_log', 'users', 'activity_log',
]
const missing = []
for (const table of EXPECTED) {
  const res = await db.execute(sql.raw(`select to_regclass('public.${table}') as t`))
  const rows = res.rows ?? res
  if (!rows?.[0]?.t) missing.push(table)
}
if (missing.length) {
  console.error(`\nMISSING TABLES: ${missing.join(', ')}`)
  console.error('If the dev server is running, stop it and run this again — the embedded')
  console.error('database allows only one process at a time.\n')
  process.exit(1)
}
console.log(`verified: all ${EXPECTED.length} tables present\n`)

const productCount = await importProducts(db)
console.log('')
const redirectCount = await importRedirects(db)

// Record what setup did, so the log reflects the real history of the site
// rather than starting blank.
const { log } = await import('../src/lib/activity.server.js')
await log(null, 'setup.schema', {
  entityType: 'database',
  entityLabel: `${files.length} migration(s) applied`,
})
await log(null, 'setup.catalogue', {
  entityType: 'catalogue',
  entityLabel: 'Catalogue loaded from the data audit',
  details: { products: productCount },
})
await log(null, 'setup.redirects', {
  entityType: 'redirects',
  entityLabel: 'Legacy URL redirects loaded',
  details: { redirects: redirectCount },
})
console.log('\ndone. next: npm run admin:create-user')
process.exit(0)
