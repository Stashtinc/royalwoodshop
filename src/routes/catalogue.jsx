import { useLoaderData } from 'react-router'
import Catalogue from '../pages/Catalogue'
import { catalogueProducts } from '../data/catalogue'
import { pageMeta } from '../seo'

export async function loader() {
  // 1. Live DB (Railway SSR and local dev with DATABASE_URL)
  try {
    const { getDb } = await import('../lib/db.server.js')
    const { getAllProducts } = await import('../db/queries.js')
    const db = await getDb()
    const products = await getAllProducts(db)
    if (products.length > 0) return { products }
  } catch {}
  // 2. Read products.json directly from disk — bypasses Vite's module cache
  try {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const products = JSON.parse(readFileSync(resolve('src/data/products.json'), 'utf8'))
    if (products.length > 0) return { products }
  } catch {}
  // 3. Static module import (last resort)
  return { products: catalogueProducts }
}

export const meta = () => pageMeta({
  title: 'Trim, Mouldings & Interior Doors Catalogue',
  description: 'Browse over 500 in-stock trim profiles, mouldings and interior doors. Filter by availability, wood species, profile type and width. Delivery throughout Toronto, the GTA and York Region.',
  path: '/products',
})

export default function Route() {
  const { products } = useLoaderData()
  return <Catalogue products={products} />
}
