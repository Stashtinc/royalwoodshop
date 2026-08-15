import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import * as schema from '../db/schema.js'

/**
 * One database interface, two backends.
 *
 *   DATABASE_URL set    → real PostgreSQL (a VPS, or any managed provider)
 *   DATABASE_URL unset  → embedded Postgres stored in .data/pg
 *
 * The embedded mode is a genuine PostgreSQL build, not an imitation, so the
 * schema, queries and migrations are identical in both. Moving to a server is
 * a dump, a restore, and setting one environment variable.
 *
 * `.server.js` keeps this out of the browser bundle.
 */
let instance = null

/**
 * Applies any migration in drizzle/ that has not run yet.
 *
 * Only in embedded mode. The embedded database allows a single process, so a
 * separate migration command cannot reach it while the server is running —
 * the server has to own this. Against a real PostgreSQL, migrations stay a
 * deliberate step (`npm run db:setup`) rather than something a deploy does
 * silently.
 */
async function ensureSchema(db) {
  const { readdirSync, readFileSync, existsSync } = await import('node:fs')
  const { sql } = await import('drizzle-orm')
  if (!existsSync('drizzle')) return

  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
      const s = stmt.trim()
      if (!s) continue
      try { await db.execute(sql.raw(s)) }
      catch (e) {
        const msg = `${e.message} ${e.cause?.message ?? ''}`
        if (!/already exists|duplicate/i.test(msg)) {
          console.error(`[db] migration statement failed in ${file}: ${e.cause?.message ?? e.message}`)
        }
      }
    }
  }
}

export async function getDb() {
  if (instance) return instance

  const url = process.env.DATABASE_URL
  if (url) {
    const postgres = (await import('postgres')).default
    const client = postgres(url, { prepare: false, max: 5 })
    instance = drizzlePg(client, { schema })
    instance.$mode = 'postgres'
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    const { mkdirSync } = await import('node:fs')
    mkdirSync('.data/pg', { recursive: true })
    const client = new PGlite('.data/pg')          // persisted to disk
    await client.waitReady
    instance = drizzlePglite(client, { schema })
    instance.$mode = 'embedded'
    await ensureSchema(instance)
  }
  return instance
}

export { schema }
