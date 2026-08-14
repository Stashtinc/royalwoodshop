import { useLoaderData } from 'react-router'
import Catalogue from '../pages/Catalogue'
import { catalogueProducts } from '../data/catalogue'
import { CATEGORY_SLUGS } from '../data/catalogue'
import { pageMeta, truncate } from '../seo'

const NAMES = Object.fromEntries(Object.entries(CATEGORY_SLUGS).map(([n, s]) => [s, n]))

const BLURB = {
  'trim-mouldings': 'Baseboards, casings, crown, backband, chair rail and decorative profiles, milled in poplar, MDF and hardwoods.',
  'interior-doors': 'Shaker, moulded panel, French, barn and flush interior doors, in stock and made to order.',
  'door-hardware': 'Handles, levers, knobs, hinges, pocket door and sliding track hardware.',
  'stair-railing': 'Treads, risers, newel posts, spindles, handrails and stair components.',
}

export function loader({ params }) {
  const name = NAMES[params.category]
  if (!name) throw new Response('Not found', { status: 404 })
  const all = catalogueProducts
  const products = all.filter((p) => p.categorySlug === params.category)
  if (!products.length) throw new Response('Not found', { status: 404 })
  return { category: params.category, name, products }
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
  const { name, products } = useLoaderData()
  return <Catalogue initialCategory={name} products={products} />
}
