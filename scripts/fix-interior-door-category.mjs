/**
 * One-time fix: the "interior-doors" category has the wrong name "Interior Door"
 * (missing the trailing 's'). This causes the sidebar to show "Interior Door (120)"
 * as a rogue entry while "Interior Doors (0)" appears empty.
 *
 *   railway run node scripts/fix-interior-door-category.mjs
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { getDb } from '../src/lib/db.server.js'
import { categories } from '../src/db/schema.js'
import { syncProductsJson } from '../src/lib/sync.server.js'

const db = await getDb()

const [cat] = await db.select({ id: categories.id, name: categories.name })
  .from(categories).where(eq(categories.slug, 'interior-doors')).limit(1)

if (!cat) {
  console.error('interior-doors category not found — nothing to fix.')
  process.exit(1)
}

console.log(`Found id=${cat.id}  current name: "${cat.name}"`)

if (cat.name === 'Interior Doors') {
  console.log('Name is already correct — nothing to do.')
} else {
  await db.update(categories)
    .set({ name: 'Interior Doors', updatedAt: new Date() })
    .where(eq(categories.slug, 'interior-doors'))
  console.log('Renamed to "Interior Doors".')
}

console.log('Syncing products.json…')
const { products: count } = await syncProductsJson()
console.log(`Done — ${count} products written. Interior Doors should now show correctly.`)
process.exit(0)
