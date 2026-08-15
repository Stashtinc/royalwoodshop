import { BASE, INDEXING_ENABLED } from '../seo'

/**
 * Crawling is off unless switched on deliberately.
 *
 * The site will move hosts before launch, and a temporary address that gets
 * indexed becomes a duplicate of the real site that is awkward to remove.
 * Requiring an explicit VITE_SEARCH_INDEXING=on means no deploy can start
 * inviting crawlers by accident.
 */
export function loader() {
  const body = INDEXING_ENABLED
    ? `User-agent: *
Allow: /
Disallow: /quotation
Disallow: /admin

Sitemap: ${BASE}/sitemap.xml
`
    : `# Indexing is switched off for this deploy.
# Set VITE_SEARCH_INDEXING=on, on the final domain only, to allow crawling.
User-agent: *
Disallow: /
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
      'X-Robots-Tag': INDEXING_ENABLED ? 'all' : 'noindex, nofollow',
    },
  })
}
