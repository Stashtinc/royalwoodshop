import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import { products, productAttributes } from '../../db/schema.js'
import { and, eq, asc, ne } from 'drizzle-orm'

/** The products ticked with an attribute value (for the hover list on the Attributes page). */
export async function loader({ request }) {
  await requireUser(request)
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json([])
  const db = await getDb()
  const rows = await db
    .select({ id: products.id, name: products.name, productCode: products.productCode })
    .from(products)
    .innerJoin(productAttributes, eq(productAttributes.productId, products.id))
    .where(and(eq(productAttributes.attributeValueId, Number(id)), ne(products.status, 'archived')))
    .orderBy(asc(products.name))
    .limit(50)
  return Response.json(rows)
}
