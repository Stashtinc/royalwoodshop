import products from './src/data/products.json' with { type: 'json' }
import { readFileSync } from 'node:fs'

/** Article slugs, read from the same export the database is loaded from. */
function articleSlugs() {
  try {
    const text = readFileSync('data/posts.csv', 'utf8')
    return text.split('\n').slice(1)
      .map((line) => line.match(/^\d+,"?([a-z0-9-]+)"?,/)?.[1])
      .filter(Boolean)
  } catch { return [] }
}

const STATIC_PAGES = [
  '/', '/products', '/contact', '/the-royal-edge', '/core-values',
  '/environmental-commitment', '/services', '/resources',
]

/** @type {import('@react-router/dev/config').Config} */
export default {
  appDirectory: 'src',
  ssr: true,
  // All routes are prerendered, so embed the full route manifest in the
  // initial HTML rather than lazily fetching /__manifest from a server that
  // doesn't exist on a static Netlify deploy.
  routeDiscovery: { mode: 'initial' },
  // Every page is rendered to static HTML at build time. Search engines and
  // social scrapers get complete markup without executing any JavaScript.
  async prerender() {
    return [
      ...STATIC_PAGES,
      ...[...new Set(products.map((p) => p.categorySlug))].map((c) => `/products/${c}`),
      ...products.map((p) => `/products/${p.categorySlug}/${p.slug}`),
      '/blog',
      ...articleSlugs().map((s) => `/${s}`),
      '/404',
      '/sitemap.xml',
      '/robots.txt',
    ]
  },
}
