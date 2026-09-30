import { redirect } from 'react-router'

/**
 * /products/:category/:slug/spec-sheet.pdf
 *
 * Served inline so Print opens it in the browser's PDF viewer; ?download=1
 * sends it as an attachment for the Download button.
 */
export async function loader({ params, request }) {
  const { loadAllProducts } = await import('../lib/products.server.js')
  const product = (await loadAllProducts()).find((p) => p.slug === params.slug)
  if (!product) throw new Response('Not found', { status: 404 })

  const url = new URL(request.url)
  if (product.categorySlug !== params.category) {
    throw redirect(`/products/${product.categorySlug}/${product.slug}/spec-sheet.pdf${url.search}`, 301)
  }

  const { renderSpecSheet } = await import('../lib/spec-sheet.server.js')
  const pdf = await renderSpecSheet(product)
  const filename = `${(product.productCode || product.slug).replace(/[^A-Za-z0-9._-]+/g, '-')}-spec-sheet.pdf`
  const disposition = url.searchParams.has('download') ? 'attachment' : 'inline'

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
      // A copy of the product page, not a page of its own.
      'X-Robots-Tag': 'noindex',
    },
  })
}
