import { requireUser } from '../../lib/auth.server'
import { productWithCode } from '../../lib/admin-queries.server'

/** Is this product code already used by another product? For the code field's live check. */
export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const taken = await productWithCode(url.searchParams.get('code'), url.searchParams.get('except') || null)
  return Response.json({ taken })
}
