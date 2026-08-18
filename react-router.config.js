import products from './src/data/products.json' with { type: 'json' }
import articles from './src/data/posts.json' with { type: 'json' }

/** Published articles keep the addresses WordPress used. */
const articleSlugs = () =>
  articles.filter((a) => a.status === 'published').map((a) => a.slug)

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
      '/consultation',
      '/material-estimate-and-quotation',
      '/services/delivery',
      '/saw-blade-sharpening',
      ...articleSlugs().map((s) => `/${s}`),
      '/404',
      '/sitemap.xml',
      '/robots.txt',
    ]
  },
}
