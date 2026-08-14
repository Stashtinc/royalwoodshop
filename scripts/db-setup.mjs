/**
 * Creates the tables and loads the catalogue. Works with or without a server.
 *
 *   npm run db:setup
 *
 * With no DATABASE_URL this builds an embedded Postgres in .data/pg — nothing
 * to install. Set DATABASE_URL later and run the same command against a real
 * server; the schema is identical.
 */
import { readFileSync, existsSync } from 'node:fs'
import { getDb } from '../src/lib/db.server.js'
import { sql } from 'drizzle-orm'
import { run as importProducts } from './import-products.mjs'
import { run as importRedirects } from './import-redirects.mjs'

const db = await getDb()
console.log(`database: ${db.$mode === 'embedded' ? 'embedded Postgres (.data/pg)' : 'PostgreSQL via DATABASE_URL'}\n`)

const migration = ['drizzle/0000_last_blizzard.sql', 'drizzle/0000_small_network.sql']
  .find((f) => existsSync(f))
if (!migration) { console.error('no migration file found in drizzle/'); process.exit(1) }

let applied = 0
for (const stmt of readFileSync(migration, 'utf8').split('--> statement-breakpoint')) {
  const s = stmt.trim()
  if (!s) continue
  try { await db.execute(sql.raw(s)); applied++ }
  catch (e) {
    if (!/already exists/i.test(e.message)) throw e
  }
}
console.log(`schema: ${applied} statements applied\n`)

await importProducts(db)
console.log('')
await importRedirects(db)
console.log('\ndone. next: npm run admin:create-user')
process.exit(0)
