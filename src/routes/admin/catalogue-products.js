import { requireUser } from '../../lib/auth.server'
import { searchProductsForCatalogue } from '../../lib/print-catalogues.server'

export const PICKER_PAGE = 50

/** The picker's filters and sort order, read from the query string. */
export function pickerFilters(searchParams) {
  return {
    // Each of these is a comma-separated list, e.g. category=3,7
    category: searchParams.get('category') ?? '',
    subcategory: searchParams.get('subcategory') ?? '',
    species: searchParams.get('species') ?? '',
    availability: searchParams.get('availability') ?? '',
    status: searchParams.get('status') ?? '',
    sort: searchParams.get('sort') ?? 'name',
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
  // ?ids_only= returns the ids of every product that matches the filters, for Select all
  if (url.searchParams.has('ids_only')) {
    const q = url.searchParams.get('q') ?? ''
    const all = await searchProductsForCatalogue(q, 100000, 0, pickerFilters(url.searchParams))
    return Response.json({ ids: all.map((p) => p.id) })
  }
  const q = url.searchParams.get('q') ?? ''
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0)
  const results = await searchProductsForCatalogue(q, PICKER_PAGE, offset, pickerFilters(url.searchParams))
  return Response.json({ results, hasMore: results.length === PICKER_PAGE })
}
