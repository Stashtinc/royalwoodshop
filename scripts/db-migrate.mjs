/**
 * Applies the named migration files from drizzle/ — and nothing else.
 *
 *   npm run db:migrate -- 0014_contact_messages.sql
 *   npm run db:migrate                 (lists the migrations, applies none)
 *
 * Use this against production after deploying a change that adds a migration.
 *
 * Why it only runs what you name: the database does not record which
 * migrations have already run, and some older ones are not safe to repeat —
 * 0010 and 0011 reset category names, order and menu settings, undoing admin
 * edits. And never use `npm run db:setup` on production: after the schema it
 * re-imports the catalogue, redirects and blog from the original CSVs,
 * overwriting every edit made in the admin since.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { sql } from 'drizzle-orm'

const all = readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()
const wanted = process.argv.slice(2)

if (!wanted.length) {
  console.log('Name the migration file(s) to apply, e.g.\n  npm run db:migrate -- 0014_contact_messages.sql\n')
  console.log('Available:')
  for (const f of all) console.log(`  ${f}`)
  process.exit(0)
}
for (const f of wanted) {
  if (!existsSync(`drizzle/${f}`)) { console.error(`no such migration: drizzle/${f}`); process.exit(1) }
}

const { getDb } = await import('../src/lib/db.server.js')
const db = await getDb()
console.log(`database: ${db.$mode === 'embedded' ? 'embedded Postgres (.data/pg)' : 'PostgreSQL via DATABASE_URL'}`)

for (const file of wanted) {
  let applied = 0, skipped = 0
  for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (!s) continue
    try { await db.execute(sql.raw(s)); applied++ }
    catch (e) {
      const msg = `${e.message} ${e.cause?.message ?? ''}`
      if (/already exists|duplicate/i.test(msg)) { skipped++; continue }
      console.error(`\nfailed in ${file}:\n  ${s.slice(0, 120)}\n  ${e.cause?.message ?? e.message}\n`)
      process.exit(1)
    }
  }
  console.log(`${file}: ${applied} statement(s) run, ${skipped} already present`)
}
process.exit(0)
