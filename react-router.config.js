import 'dotenv/config'
import products from './src/data/products.json' with { type: 'json' }
import articles from './src/data/posts.json' with { type: 'json' }
import { STATIC_PAGES } from './src/data/staticPages.js'

/**
 * Products and category pages to prerender, from the same database the
 * loaders read. The committed snapshot drifts from it (archived products,
 * hidden categories), and every page the loader then 404s failed the build.
 * The connection is closed before rendering starts: the embedded database
 * allows one connection at a time. No database → the snapshot.
 */
async function catalogue() {
  const url = process.env.DATABASE_URL
  const { getAllProducts, listCategoryTree } = await import('./src/db/queries.js')
  const schema = await import('./src/db/schema.js')
  let client, db
  try {
    if (url) {
      client = (await import('postgres')).default(url, { prepare: false, max: 1 })
      db = (await import('drizzle-orm/postgres-js')).drizzle(client, { schema })
    } else {
      const { existsSync } = await import('node:fs')
      if (!existsSync('.data/pg')) return snapshot()
      const { PGlite } = await import('@electric-sql/pglite')
      client = new PGlite('.data/pg')
      db = (await import('drizzle-orm/pglite')).drizzle(client, { schema })
    }
    const [rows, tree] = await Promise.all([getAllProducts(db), listCategoryTree(db)])
    if (!rows.length) return snapshot()
    const hidden = new Set(tree.filter((c) => c.hidden).map((c) => c.slug))
    return {
      products: rows.map((p) => `/products/${p.categorySlug}/${p.slug}`),
      categories: [...new Set(rows.map((p) => p.categorySlug))].filter((c) => !hidden.has(c)).map((c) => `/products/${c}`),
    }
  } catch {
    return snapshot()
  } finally {
    await (url ? client?.end() : client?.close())
  }
}

const snapshot = () => ({
  products: products.map((p) => `/products/${p.categorySlug}/${p.slug}`),
  categories: [...new Set(products.map((p) => p.categorySlug))].map((c) => `/products/${c}`),
})

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
    const { products: productPages, categories } = await catalogue()
    return [
      ...STATIC_PAGES,
      ...categories,
      ...productPages,
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
