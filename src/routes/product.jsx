import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Link, useLoaderData, useRouteLoaderData } from 'react-router'
import ProductDetail from '../pages/ProductDetail'
import { catalogueProducts } from '../data/catalogue'
import { pageMeta, truncate, BASE, SITE } from '../seo'

const AVAIL_SCHEMA = {
  in_stock: 'https://schema.org/InStock',
  quick_ship: 'https://schema.org/LimitedAvailability',
  made_to_order: 'https://schema.org/PreOrder',
}

export function loader({ params }) {
  let all = catalogueProducts
  try {
    all = JSON.parse(readFileSync(resolve('src/data/products.json'), 'utf8'))
  } catch {}
  const product = all.find((p) => p.slug === params.slug)
  if (!product || product.categorySlug !== params.category) {
    throw new Response('Not found', { status: 404 })
  }
  const related = all
    .filter((p) => p.slug !== product.slug
      && (p.subcategories ?? [p.subcategory]).some((s) => (product.subcategories ?? [product.subcategory]).includes(s)))
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
  const { isAdmin } = useRouteLoaderData('root') ?? {}
  return (
    <>
      {isAdmin && product.dbId && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-6 py-2 print:hidden">
          <p className="font-sans text-xs font-medium text-amber-800">
            Admin mode — viewing as a customer
          </p>
          <Link
            to={`/admin/products/${product.dbId}`}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-sans text-xs font-medium text-white hover:bg-amber-600"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 1.5l3 3-8 8H1.5v-3l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit this product
          </Link>
        </div>
      )}
      <ProductDetail product={product} related={related} />
    </>
  )
}
