import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/** Connects using DATABASE_URL. Used by the CLI scripts in scripts/. */
export function connect() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.')
    process.exit(1)
  }
  const client = postgres(url, { prepare: false, max: 4 })
  return { db: drizzle(client, { schema }), close: () => client.end() }
}
