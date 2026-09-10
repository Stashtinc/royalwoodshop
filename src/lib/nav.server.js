import { asc, eq, sql, and } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { categories } from '../db/schema.js'

export async function listNavCategories() {
  const db = await getDb()
  return db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.inNav, true), sql`${categories.parentId} is null`))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
}
