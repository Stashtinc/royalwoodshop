import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import { products, productCategories, categories } from '../../db/schema.js'
import { eq, asc } from 'drizzle-orm'

export async function loader({ request }) {
  await requireUser(request)
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json([])
  const db = await getDb()
  const rows = await db
    .select({ id: products.id, name: products.name, productCode: products.productCode })
    .from(products)
    .innerJoin(productCategories, eq(productCategories.productId, products.id))
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(categories.id, Number(id)))
    .orderBy(asc(products.name))
    .limit(50)
  return Response.json(rows)
}
