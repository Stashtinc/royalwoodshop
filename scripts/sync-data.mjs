/**
 * Refreshes src/data/products.json from Postgres.
 *
 *   npm run sync:data
 *
 * Run this after importing the species sheet, then rebuild. The snapshot is
 * committed so the site can always be built without database access.
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/db/schema.js'
import { getAllProducts } from '../src/db/queries.js'
import { allPostsForSnapshot } from '../src/lib/posts.server.js'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1) }

const client = postgres(url, { prepare: false, max: 4 })
const rows = await getAllProducts(drizzle(client, { schema }))
await client.end()

writeFileSync('src/data/products.json', JSON.stringify(rows, null, 0))

const articles = await allPostsForSnapshot()
writeFileSync('src/data/posts.json', JSON.stringify(articles, null, 0))
const published = articles.filter((a) => a.status === 'published').length
console.log(`wrote ${articles.length} articles (${published} published)`)
const noBody = articles.filter((a) => !a.contentHtml).length
if (noBody) console.warn(`  ${noBody} have no content`)

const withSpecies = rows.filter((p) => p.species.length).length
const withAvail = rows.filter((p) => p.availability).length
console.log(`wrote ${rows.length} products`)
console.log(`  ${withSpecies} have species (${rows.length - withSpecies} still awaiting the sheet)`)
console.log(`  ${withAvail} have availability`)
console.log(`  ${rows.filter((p) => p.flexAvailable).length} available in flex`)
