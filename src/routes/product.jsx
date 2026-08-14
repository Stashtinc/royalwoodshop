import { useLoaderData } from 'react-router'
import ProductDetail from '../pages/ProductDetail'
import { catalogueProducts } from '../data/catalogue'
import { pageMeta, truncate, BASE, SITE } from '../seo'

const AVAIL_SCHEMA = {
  in_stock: 'https://schema.org/InStock',
  quick_ship: 'https://schema.org/LimitedAvailability',
  special_order: 'https://schema.org/PreOrder',
}

export function loader({ params }) {
  const all = catalogueProducts
  const product = all.find((p) => p.slug === params.slug)
  if (!product || product.categorySlug !== params.category) {
    throw new Response('Not found', { status: 404 })
  }
  const related = all
    .filter((p) => p.slug !== product.slug && p.subcategory === product.subcategory)
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)
  return { product, related }
}

export const meta = ({ data }) => {
  if (!data) return pageMeta({ title: 'Product not found', description: '', path: '/products' })
  const p = data.product
  const path = `/products/${p.categorySlug}/${p.slug}`
  const title = p.seoTitle || `${p.name}${p.productCode ? ` ${p.productCode}` : ''}`
  const description = p.seoDescription
    || truncate(p.description)
    || truncate(`${p.name}. ${p.size ? `Size ${p.size}. ` : ''}${p.species?.length ? `Available in ${p.species.join(', ')}. ` : ''}From The Royal Wood Shop, Toronto and the GTA.`)

  return pageMeta({
    title, description, path,
    image: p.image || undefined,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        sku: p.productCode || undefined,
        description,
        image: p.image || undefined,
        material: p.species?.length ? p.species : undefined,
        category: p.category,
        brand: { '@type': 'Brand', name: SITE },
        url: `${BASE}${path}`,
        ...(p.availability ? {
          offers: {
            '@type': 'Offer',
            availability: AVAIL_SCHEMA[p.availability],
            url: `${BASE}${path}`,
            seller: { '@type': 'Organization', name: SITE },
          },
        } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Products', item: `${BASE}/products` },
          { '@type': 'ListItem', position: 2, name: p.category, item: `${BASE}/products/${p.categorySlug}` },
          { '@type': 'ListItem', position: 3, name: p.name, item: `${BASE}${path}` },
        ],
      },
    ],
  })
}

export default function Route() {
  const { product, related } = useLoaderData()
  return <ProductDetail product={product} related={related} />
}
