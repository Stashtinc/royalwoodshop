/**
 * Loads data/redirects.csv into the redirects table.
 *
 * The table backs the admin redirect manager. Netlify's _redirects file is
 * generated separately at build time from the same CSV, so the two never
 * disagree.
 *
 *   npm run import:redirects
 */
import { sql } from 'drizzle-orm'
import { connect } from '../src/db/client.mjs'
import { redirects } from '../src/db/schema.js'
import { readCsv } from './_lib.mjs'

export async function run(db, file = 'data/redirects.csv') {
  const rows = readCsv(file)
  console.log(`read ${rows.length} redirects`)

  const seen = new Set()
  let loaded = 0, selfRef = 0
  for (const r of rows) {
    const from = r.from_path.trim()
    const to = r.to_path.trim()
    if (!from || seen.has(from)) continue
    if (from === to) { selfRef++; continue }
    seen.add(from)
    const statusCode = Number(r.status_code) || 301
    await db.insert(redirects).values({ fromPath: from, toPath: to, statusCode })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to, statusCode } })
    loaded++
  }

  const chains = await db.execute(sql`
    SELECT count(*)::int AS n FROM redirects a JOIN redirects b ON a.to_path = b.from_path`)
  const n = chains[0]?.n ?? chains.rows?.[0]?.n ?? 0
  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(redirects)

  console.log(`loaded ${loaded} — ${count} redirects in the database`)
  if (selfRef) console.warn(`${selfRef} self-referencing rows skipped`)
  if (n) console.warn(`WARNING: ${n} chained redirects should be flattened to a single hop`)
  return count
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close()
}
