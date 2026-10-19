import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { printCatalogues, printCatalogueItems } from '../db/schema.js'

/** Saved catalogues, newest change first, with how many products each holds. */
export async function listPrintCatalogues() {
  const db = await getDb()
  return db.select({
    id: printCatalogues.id,
    title: printCatalogues.title,
    showPrices: printCatalogues.showPrices,
    updatedAt: printCatalogues.updatedAt,
    productCount: sql`(select count(*)::int from ${printCatalogueItems} i where i.catalogue_id = ${printCatalogues.id})`,
  }).from(printCatalogues).orderBy(desc(printCatalogues.updatedAt))
}

/** A new, empty catalogue with the default title. Returns its id. */
export async function createPrintCatalogue(createdByEmail) {
  const db = await getDb()
  const [row] = await db.insert(printCatalogues)
    .values({ createdByEmail })
    .returning({ id: printCatalogues.id })
  return row.id
}

/** Deletes a catalogue and its items. Products are not touched. */
export async function deletePrintCatalogue(id) {
  const db = await getDb()
  await db.delete(printCatalogues).where(eq(printCatalogues.id, Number(id)))
}
