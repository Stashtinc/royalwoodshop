import { BASE } from '../seo'

/**
 * Only the production domain invites crawling.
 *
 * Staging and preview builds get a blanket Disallow, so a branch deploy can
 * never compete with the live site in search results. This keys off
 * VITE_SITE_URL, which netlify.toml sets per context.
 */
const PRODUCTION = 'https://www.royalwoodshop.com'

export function loader() {
  // Checked against the raw variable, not BASE — BASE falls back to the
  // production URL, so an unset variable would read as production. An
  // unconfigured deploy should be treated as staging, not published.
  const isProduction = import.meta.env.VITE_SITE_URL === PRODUCTION

  const body = isProduction
    ? `User-agent: *
Allow: /
Disallow: /quotation

Sitemap: ${BASE}/sitemap.xml
`
    : `# Non-production deploy (${BASE}) — indexing disallowed.
User-agent: *
Disallow: /
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
      'X-Robots-Tag': isProduction ? 'all' : 'noindex, nofollow',
    },
  })
}
