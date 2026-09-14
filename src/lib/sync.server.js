import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getDb } from './db.server.js'
import { getAllProducts } from '../db/queries.js'
import { categories as catsTable } from '../db/schema.js'
import { eq } from 'drizzle-orm'

/**
 * Regenerates products.json and navCategories.json from the database.
 * These files are what the public-facing routes read, so calling this after
 * any import or bulk edit makes changes visible to visitors immediately.
 */
export async function syncProductsJson() {
  const db = await getDb()

  const rows = await getAllProducts(db)
  await writeFile(resolve('src/data/products.json'), JSON.stringify(rows, null, 0))

  const navCats = await db
    .select({ name: catsTable.name, slug: catsTable.slug })
    .from(catsTable)
    .where(eq(catsTable.inNav, true))
    .orderBy(catsTable.sortOrder)
  await writeFile(resolve('src/data/navCategories.json'), JSON.stringify(navCats, null, 0))

  return { products: rows.length }
}
