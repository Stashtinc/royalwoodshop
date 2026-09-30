import { catalogueProducts } from '../data/catalogue'
import { publishedPosts } from '../data/blog'
import { BASE, INDEXING_ENABLED } from '../seo'
import { STATIC_PAGES as STATIC } from '../data/staticPages'

/** Content pages that are not in STATIC_PAGES: the service pages keep their
 *  WordPress addresses, and the resource pages were added later. Utility
 *  pages (404, design-system, workorder, admin) are deliberately left out. */
const MORE_PAGES = [
  '/blog',
  '/consultation',
  '/material-estimate-and-quotation',
  '/services/delivery',
  '/saw-blade-sharpening',
  '/resources',
  '/resources/downloads',
  '/glossary',
  '/faq',
  '/installation-tips',
]

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null)

/**
 * Built per request from the live database, so a product added, moved or
 * archived in the admin is reflected at once — the old version read the
 * catalogue snapshot baked in at build time and listed no articles at all.
 * Falls back to the snapshot only when there is no database.
 */
export async function loader() {
  // No point publishing a sitemap for a site that disallows crawling.
  if (!INDEXING_ENABLED) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml', 'X-Robots-Tag': 'noindex' },
    })
  }

  let products = null
  try {
    const { getDb } = await import('../lib/db.server.js')
    const { getAllProducts } = await import('../db/queries.js')
    products = await getAllProducts(await getDb())
  } catch {}
  if (!products?.length) products = catalogueProducts

  const cats = [...new Set(products.map((p) => p.categorySlug))].sort()
  const urls = [
    ...STATIC.map((p) => ({ loc: p, priority: p === '/' ? '1.0' : '0.8' })),
    ...MORE_PAGES.map((p) => ({ loc: p, priority: '0.6' })),
    ...cats.map((c) => ({ loc: `/products/${c}`, priority: '0.9' })),
    ...products.map((p) => ({ loc: `/products/${p.categorySlug}/${p.slug}`, priority: '0.7' })),
    // Articles keep their WordPress addresses and are the best-ranking pages.
    ...publishedPosts.map((a) => ({
      loc: `/${a.slug}`,
      priority: '0.7',
      lastmod: day(a.updatedAt ?? a.publishedAt),
    })),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(BASE + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
