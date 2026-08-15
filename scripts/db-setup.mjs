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
console.log(`database: ${db.$mode === 'embedded' ? 'embedded Postgres (.data/pg)' : 'PostgreSQL via DATABASE_URL'}\n`)

const files = readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()
if (!files.length) { console.error('no migration files in drizzle/'); process.exit(1) }

let applied = 0
for (const file of files) {
  for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (!s) continue
    try { await db.execute(sql.raw(s)); applied++ }
    catch (e) {
      // Re-running setup is expected; only genuine failures should stop it.
      const msg = `${e.message} ${e.cause?.message ?? ''}`
      if (!/already exists|duplicate/i.test(msg)) throw e
    }
  }
}
console.log(`schema: ${files.length} migration(s), ${applied} statements applied\n`)

await importProducts(db)
console.log('')
await importRedirects(db)
console.log('\ndone. next: npm run admin:create-user')
process.exit(0)
