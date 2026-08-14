import { useLoaderData } from 'react-router'
import Catalogue from '../pages/Catalogue'
import { catalogueProducts } from '../data/catalogue'
import { pageMeta } from '../seo'

export function loader() {
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
