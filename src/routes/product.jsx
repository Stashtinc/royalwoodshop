import { Link, redirect, useLoaderData, useRouteLoaderData } from 'react-router'
import ProductDetail from '../pages/ProductDetail'
import { pageMeta, BASE, SITE, productSeoTitle, productSeoDescription } from '../seo'

const AVAIL_SCHEMA = {
  in_stock: 'https://schema.org/InStock',
  quick_ship: 'https://schema.org/LimitedAvailability',
  made_to_order: 'https://schema.org/PreOrder',
}

export async function loader({ params }) {
  const { loadAllProducts } = await import('../lib/products.server.js')
  const all = await loadAllProducts()

  const product = all.find((p) => p.slug === params.slug)
  if (!product) throw new Response('Not found', { status: 404 })

  // Moved to another category in the admin: send the old address to the new
  // one instead of a 404, so links and rankings follow the product.
  if (product.categorySlug !== params.category) {
    throw redirect(`/products/${product.categorySlug}/${product.slug}`, 301)
  }

  const related = all
    .filter((p) => p.slug !== product.slug
      && (p.subcategories ?? [p.subcategory]).some((s) => (product.subcategories ?? [product.subcategory]).includes(s)))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)
  // Per-species Part IDs. A database without the table yet (migration 0015
  // not applied) simply has none.
  let partIds = []
  if (product.dbId) {
    try {
      const { partIdsForProduct } = await import('../lib/part-ids.server.js')
      partIds = await partIdsForProduct(product.dbId)
    } catch {}
  }

  return { product: { ...product, partIds }, related }
}

export const meta = ({ data }) => {
  if (!data) return pageMeta({ title: 'Product not found', description: '', path: '/products' })
  const p = data.product
  const path = `/products/${p.categorySlug}/${p.slug}`
  const title = p.seoTitle || productSeoTitle(p)
  const description = p.seoDescription
    || productSeoDescription({ ...p, species: p.species ?? [] })

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
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-amber-300 bg-amber-50 px-6 py-2 print:hidden">
          <p className="font-sans text-xs font-medium text-amber-800">
            Admin mode — public view
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
