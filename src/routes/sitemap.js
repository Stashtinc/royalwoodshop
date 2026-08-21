import { catalogueProducts } from '../data/catalogue'
import { BASE, INDEXING_ENABLED } from '../seo'
import { STATIC_PAGES as STATIC } from '../data/staticPages'

export function loader() {
  // No point publishing a sitemap for a site that disallows crawling.
  if (!INDEXING_ENABLED) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml', 'X-Robots-Tag': 'noindex' },
    })
  }
  const cats = [...new Set(catalogueProducts.map((p) => p.categorySlug))]
  const urls = [
    ...STATIC.map((p) => ({ loc: p, priority: p === '/' ? '1.0' : '0.8' })),
    ...cats.map((c) => ({ loc: `/products/${c}`, priority: '0.9' })),
    ...catalogueProducts.map((p) => ({ loc: `/products/${p.categorySlug}/${p.slug}`, priority: '0.7' })),
  ]
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
