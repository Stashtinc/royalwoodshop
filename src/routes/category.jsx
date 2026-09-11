import { useLoaderData } from 'react-router'
import Catalogue from '../pages/Catalogue'
import { catalogueProducts, catsOf } from '../data/catalogue'
import { CATEGORY_SLUGS } from '../data/catalogue'
import { pageMeta, truncate } from '../seo'

const NAMES = Object.fromEntries(Object.entries(CATEGORY_SLUGS).map(([n, s]) => [s, n]))

const BLURB = {
  'trim-mouldings': 'Baseboards, casings, crown, backband, chair rail and decorative profiles, milled in poplar, MDF and hardwoods.',
  'interior-doors': 'Shaker, moulded panel, French, barn and flush interior doors, in stock and made to order.',
  'door-hardware': 'Handles, levers, knobs, hinges, pocket door and sliding track hardware.',
  'stair-railing': 'Treads, risers, newel posts, spindles, handrails and stair components.',
}

export async function loader({ params }) {
  // Static lookup first — covers all pre-existing categories
  let name = NAMES[params.category]
  let products = null
  let dbCategories = []

  try {
    const { getDb } = await import('../lib/db.server.js')
    const { getAllProducts, listCategoryTree } = await import('../db/queries.js')
    const { categories: catsTable } = await import('../db/schema.js')
    const { eq } = await import('drizzle-orm')
    const db = await getDb()

    // Resolve category name from DB for categories not in the static map
    if (!name) {
      const rows = await db
        .select({ name: catsTable.name })
        .from(catsTable)
        .where(eq(catsTable.slug, params.category))
        .limit(1)
      if (rows.length) name = rows[0].name
    }

    if (name) {
      const [all, tree] = await Promise.all([getAllProducts(db), listCategoryTree(db)])
      if (all.length > 0) { products = all; dbCategories = tree }
    }
  } catch {
    // DB not available — fall back to static snapshot
  }

  if (!name) throw new Response('Not found', { status: 404 })

  // Snapshot fallback for Netlify prerender / build environments and local dev
  if (products === null) {
    // Read directly from disk to bypass any stale Vite module cache
    try {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      products = JSON.parse(readFileSync(resolve('src/data/products.json'), 'utf8'))
    } catch {
      products = catalogueProducts
    }
  }

  return { category: params.category, name, products, dbCategories }
}

export const meta = ({ data }) => {
  if (!data) return pageMeta({ title: 'Not found', description: '', path: '/products' })
  return pageMeta({
    title: `${data.name} | Toronto & GTA`,
    description: truncate(`${BLURB[data.category] ?? ''} ${data.products.length} products available across the GTA.`),
    path: `/products/${data.category}`,
  })
}

export default function Route() {
  const { name, products, dbCategories = [] } = useLoaderData()
  return <Catalogue initialCategory={name} products={products} dbCategories={dbCategories} />
}
