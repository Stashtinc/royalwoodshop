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
  }
  return instance
}

export { schema }
