import { requireUser } from '../../lib/auth.server'
import { searchProductsForCatalogue } from '../../lib/print-catalogues.server'

export const PICKER_PAGE = 50

/** The picker's filters, read from the query string. */
export function pickerFilters(searchParams) {
  return {
    category: searchParams.get('category') ?? '',
    species: searchParams.get('species') ?? '',
    status: searchParams.get('status') ?? '',
  }
}

/** JSON batches of products for the catalogue picker, for infinite scroll. */
export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  // ?ids= returns exactly those products, for the Selected view
  if (url.searchParams.has('ids')) {
    const ids = url.searchParams.get('ids').split(',').map(Number).filter(Boolean)
    const picked = ids.length ? await searchProductsForCatalogue('', ids.length, 0, { ids }) : []
    return Response.json({ results: picked, hasMore: false })
  }
  const q = url.searchParams.get('q') ?? ''
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0)
  const results = await searchProductsForCatalogue(q, PICKER_PAGE, offset, pickerFilters(url.searchParams))
  return Response.json({ results, hasMore: results.length === PICKER_PAGE })
}
