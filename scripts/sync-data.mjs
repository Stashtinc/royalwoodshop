/**
 * Refreshes src/data/products.json and posts.json from the database.
 *
 *   npm run sync:data
 *
 * Run this after editing content, then rebuild. The snapshots are committed so
 * the site can always be built without database access.
 *
 * Uses getDb() rather than requiring DATABASE_URL, so it works against the
 * embedded database as well as a real server. Insisting on DATABASE_URL meant
 * the documented publish workflow could not be run locally at all.
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { getDb } from '../src/lib/db.server.js'
import { getAllProducts } from '../src/db/queries.js'
import { allPostsForSnapshot } from '../src/lib/posts.server.js'
import { log } from '../src/lib/activity.server.js'

const db = await getDb()
const rows = await getAllProducts(db)

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

// Publishing is the step that changes what customers actually see, so it is the
// one thing the activity log most needs to record. Until now nothing emitted
// it, despite site.published being treated as a milestone.
await log(null, 'site.published', {
  entityLabel: 'Snapshots refreshed for the public site',
  details: { products: rows.length, articles: articles.length, published },
})
console.log('\nrecorded in the activity log — run `npm run build` to publish')
process.exit(0)
