import { requireUser } from '../../lib/auth.server'
import { productsForPreview } from '../../lib/print-catalogues.server'

/** Full product details for ticked products, so the preview can show them before they are saved. */
export async function loader({ request }) {
  await requireUser(request)
  const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',').map(Number).filter(Boolean)
  return Response.json({ items: await productsForPreview(ids) })
}
