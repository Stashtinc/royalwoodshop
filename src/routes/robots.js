import { BASE } from '../seo'

export function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /quotation

Sitemap: ${BASE}/sitemap.xml
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
