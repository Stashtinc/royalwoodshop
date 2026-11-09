/** Product search for the site search box: GET /api/search?q=cap-2 */
export async function loader({ request }) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100)
  if (q.length < 2) return Response.json({ results: [] })
  try {
    const { searchProducts } = await import('../lib/product-search.server.js')
    const results = await searchProducts(q, 8)
    return Response.json({ results }, { headers: { 'Cache-Control': 'private, max-age=30' } })
  } catch {
    // No database (static builds) or a failed query: the search box still works with its pages list.
    return Response.json({ results: [] })
  }
}
