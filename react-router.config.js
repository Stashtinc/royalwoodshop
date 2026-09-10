import products from './src/data/products.json' with { type: 'json' }
import articles from './src/data/posts.json' with { type: 'json' }
import { STATIC_PAGES } from './src/data/staticPages.js'

/** Published articles keep the addresses WordPress used. */
const articleSlugs = () =>
  articles.filter((a) => a.status === 'published').map((a) => a.slug)

/** @type {import('@react-router/dev/config').Config} */
export default {
  appDirectory: 'src',
  ssr: true,
  // All routes are prerendered, so embed the full route manifest in the
  // initial HTML rather than lazily fetching /__manifest from a server that
  // doesn't exist on a static Netlify deploy.
  routeDiscovery: { mode: 'initial' },
  // Every page is rendered to static HTML at build time for Netlify.
  // Railway uses react-router-serve (SSR) and never reads these files,
  // so skip the expensive step there to keep Railway builds fast.
  async prerender() {
    if (process.env.RAILWAY_ENVIRONMENT) return []
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
