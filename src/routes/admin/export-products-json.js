import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server'
import { getAllProducts } from '../../db/queries'

export async function loader({ request }) {
  await requireUser(request)
  const db = await getDb()
  const products = await getAllProducts(db)
  return new Response(JSON.stringify(products, null, 0), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="products.json"',
    },
  })
}
