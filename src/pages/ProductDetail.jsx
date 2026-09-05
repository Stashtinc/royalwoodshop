import { Link, useParams, useNavigate } from 'react-router'
import { useState } from 'react'
import { catalogueProducts, productPath, relatedTo, speciesSummary, availabilityKeys } from '../data/catalogue'
import { srcSet, thumbSrc, imageFit } from '../lib/images'

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1v9m0 0L4.5 6.5M8 10l3.5-3.5M1.5 11.5v1a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Print-only specification sheet.
 *
 * A purpose-built one-page layout rather than a restyled web page — the site
 * layout uses min-h-screen and multi-column grids that do not translate to
 * paper. Everything else on the page is hidden when printing.
 */
function SpecSheet({ product }) {
  const rows = [
    ['Product code', product.productCode],
    ['Size', product.size],
    ['Species', product.species?.length ? speciesSummary(product) : null],
    ['Flexible version', product.flexAvailable ? 'Available' : null],
    ['Category', product.category],
    ['Type', product.subcategory],
    ['Availability', product.availabilityLabel],
    ['Lead time', product.leadTime],
  ].filter(([, v]) => v)

  return (
    <div className="hidden print:block">
      <div className="flex items-start justify-between border-b border-gray-400 pb-3">
        <div>
          <p className="font-serif text-xl font-bold text-black">The Royal Wood Shop</p>
          <p className="font-sans text-[11px] text-gray-600">Product specification sheet</p>
        </div>
        <p className="font-sans text-[11px] text-gray-600">Since 1982 · royalwoodshop.com</p>
      </div>

      <h1 className="mt-5 font-serif text-2xl leading-tight font-bold text-black">{product.name}</h1>
      {product.productCode && (
        <p className="mt-1 font-sans text-sm tracking-wide text-gray-700">{product.productCode}</p>
      )}

      {(product.images?.[1]?.url || product.image) && (
        <img
          src={product.images?.[1]?.url || product.image}
          alt={`${product.name} profile drawing`}
          className="mx-auto my-5 max-h-[75mm] w-auto object-contain"
        />
      )}

      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-200">
              <th className="w-[38%] py-1.5 text-left align-top font-sans text-[11px] font-bold text-gray-700">
                {label}
              </th>
              <td className="py-1.5 text-left align-top font-sans text-[11px] text-black">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {product.description && (
        <p className="mt-4 font-sans text-[11px] leading-relaxed text-gray-800">{product.description}</p>
      )}

      <div className="mt-6 border-t border-gray-400 pt-3">
        <p className="font-sans text-[10px] text-gray-700">
          18237 Woodbine Ave, East Gwillimbury, ON L0G 1V0 · 905-727-1387 · info@royalwoodshop.com
        </p>
        <p className="font-sans text-[10px] text-gray-500">
          royalwoodshop.com/products/{product.categorySlug}/{product.slug} · Sizes and availability
          subject to change; confirm at time of order.
        </p>
      </div>
    </div>
  )
}

function RelatedCard({ product }) {
  return (
    <Link
      to={productPath(product)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg"
    >
      <div className={`aspect-[4/3] w-full overflow-hidden bg-white ${imageFit(product.imageRole).pad ? 'p-4' : ''}`}>
        <img
          src={thumbSrc(product.image, product.imageWidth)}
          srcSet={srcSet(product.image, product.imageWidth) ?? undefined}
          sizes="(min-width: 1024px) 300px, 45vw"
          alt={`${product.name}${product.productCode ? ` (${product.productCode})` : ''} profile drawing`}
          loading="lazy"
          className={`h-full w-full ${imageFit(product.imageRole).className} transition-transform duration-300 group-hover:scale-105`}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-serif text-base leading-snug font-medium text-tundora">{product.name}</p>
        <div className="mt-auto flex flex-col gap-0.5 font-sans text-xs text-gray-500">
          <p>
            <span className="font-medium text-gray-700">Product Code </span>
            {product.productCode}
          </p>
          <p>
            <span className="font-medium text-gray-700">Size </span>
            {product.size}
          </p>
        </div>
      </div>
    </Link>
  )
}

function Gallery({ product }) {
  const images = product.images?.length ? product.images : [{ url: product.image, role: product.imageRole, width: product.imageWidth, alt: product.name }]
  const [active, setActive] = useState(0)
  const main = images[active] ?? images[0]

  return (
    <div className="flex flex-col gap-3">
      <div className={`aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white ${imageFit(main.role).pad ? 'p-6' : ''}`}>
        <img
          key={main.url}
          src={main.url}
          srcSet={srcSet(main.url, main.width) ?? undefined}
          sizes="(min-width: 1024px) 480px, 92vw"
          alt={main.alt || product.name}
          className={`h-full w-full ${imageFit(main.role).className}`}
        />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-white transition-colors ${i === active ? 'border-royal-blue' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <img src={thumbSrc(img.url, img.width)} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductDetail({ product: productProp = null, related: relatedProp = null }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = productProp ?? catalogueProducts.find((p) => p.slug === slug)

  if (!product) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-32 text-center">
        <p className="font-serif text-2xl font-bold text-tundora">Product not found</p>
        <p className="font-sans text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/products"
          className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
        >
          Back to Catalogue
        </Link>
      </section>
    )
  }

  const related = relatedProp ?? catalogueProducts.filter(
    (p) => p.id !== product.id && p.subcategory === product.subcategory,
  ).slice(0, 4)

  const AVAILABILITY_BADGE = {
    in_stock:      { label: 'In Stock',      className: 'bg-green-100 text-green-800' },
    quick_ship:    { label: 'Quick Ship',    className: 'bg-amber-100 text-amber-800' },
    made_to_order: { label: 'Made-to-Order', className: 'bg-gray-100 text-gray-600' },
  }

  const specs = [
    { label: 'Product Code', value: product.productCode },
    { label: 'Size', value: product.size },
    {
      label: 'Price',
      value: product.price != null ? String(product.price) : null,
      render: product.price != null
        ? () => (
            <span className="flex flex-wrap items-center gap-2">
              {product.salePrice != null ? (
                <>
                  <span className="font-semibold text-red-600">${Number(product.salePrice).toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through">${Number(product.price).toFixed(2)}</span>
                  <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">On Sale</span>
                </>
              ) : (
                <span>${Number(product.price).toFixed(2)}</span>
              )}
            </span>
          )
        : null,
    },
    // Species comes from the sheet Royal Wood Shop are completing. Until a
    // product has it, the row is omitted rather than showing a bare 'wood'.
    {
      label: product.species?.length > 1 ? 'Available in' : 'Species',
      value: product.species?.length ? speciesSummary(product) : null,
      render: product.speciesAvailability?.length
        ? () => (
            <span className="flex flex-col gap-1.5 pt-0.5">
              {product.speciesAvailability.map((s) => {
                const badge = s.availability ? AVAILABILITY_BADGE[s.availability] : null
                return (
                  <span key={s.name} className="flex items-center justify-between gap-2">
                    <span className="font-sans text-sm text-tundora">{s.name}</span>
                    {badge && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                )
              })}
            </span>
          )
        : null,
    },
    { label: 'Flexible version', value: product.flexAvailable ? 'Available' : null },
    { label: 'Category', value: product.category },
    { label: 'Type', value: product.subcategory },
    {
      label: 'Availability',
      value: product.availabilityLabel ?? null,
      render: availabilityKeys(product).length
        ? () => (
            <span className="flex flex-wrap gap-1.5">
              {availabilityKeys(product).map((key) => {
                const badge = AVAILABILITY_BADGE[key]
                return badge
                  ? <span key={key} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                  : null
              })}
            </span>
          )
        : null,
    },
    { label: 'Lead time', value: product.leadTime ?? null },
  ].filter((s) => s.value)

  return (
    <div className="w-full bg-[#fbfbfb]">
      <SpecSheet product={product} />
      <div className="print:hidden">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-6 py-3 font-sans text-xs text-gray-400 lg:px-8">
          <Link to="/" className="transition-colors hover:text-royal-blue">Home</Link>
          <ChevronRight />
          <Link to="/products" className="transition-colors hover:text-royal-blue">Catalogue</Link>
          <ChevronRight />
          <span className="text-tundora">{product.name}</span>
        </div>
      </div>

      {/* Main product section */}
      <section className="py-12 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* Image gallery */}
            <div className="w-full shrink-0 lg:w-[480px]">
              <Gallery product={product} />
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="font-sans text-xs font-bold tracking-widest text-royal-blue uppercase">
                  {product.subcategory} · {product.category}
                </p>
                <h1 className="font-serif text-3xl font-bold leading-tight text-tundora lg:text-4xl">
                  {product.name}
                </h1>
                {product.description && (
                  <p className="mt-2 font-sans text-base leading-relaxed text-gray-600">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="h-px w-full bg-gray-200" />

              {/* Specs */}
              <div className="flex flex-col gap-3">
                <p className="font-serif text-sm font-bold text-tundora">Specifications</p>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {specs.map(({ label, value, render }) => (
                    <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-white p-3.5 border border-gray-100">
                      <dt className="font-sans text-xs font-semibold tracking-wide text-gray-400 uppercase">{label}</dt>
                      <dd className="font-sans text-sm font-medium text-tundora">{render ? render() : value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="h-px w-full bg-gray-200" />

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
                >
                  Get a Quote
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-sans text-sm font-medium text-tundora transition-colors hover:border-royal-blue hover:text-royal-blue print:hidden"
                >
                  <DownloadIcon />
                  Spec sheet (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-sans text-sm font-medium text-tundora transition-colors hover:border-royal-blue hover:text-royal-blue"
                >
                  Back to Catalogue
                </button>
              </div>

              <p className="font-sans text-xs text-gray-400 print:hidden">
                Spec sheet opens your print dialog — choose <span className="font-medium">Save as PDF</span> as the destination.
              </p>

              <p className="font-sans text-xs text-gray-400">
                Pricing is available upon request. Contact us for stock availability and delivery options across Toronto and the GTA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="border-t border-gray-200 py-12 print:hidden lg:py-16">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-sans text-xs font-bold tracking-widest text-royal-blue uppercase">More like this</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-tundora">
                  Other {product.subcategory} Products
                </h2>
              </div>
              <Link
                to="/products"
                className="font-sans text-sm text-royal-blue underline underline-offset-2 hover:text-royal-blue-dark"
              >
                View all products
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <RelatedCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quote CTA banner */}
      <section className="bg-royal-blue py-14 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 text-center lg:px-8">
          <p className="font-sans text-xs font-bold tracking-widest text-white/60 uppercase">Ready to order?</p>
          <h2 className="font-serif text-3xl font-bold text-white lg:text-4xl">
            Talk to us about this product
          </h2>
          <p className="max-w-xl font-sans text-base leading-relaxed text-white/75">
            Our team can confirm stock availability, pricing, and delivery options for your project across Toronto and the GTA.
          </p>
          <Link
            to="/contact"
            className="rounded-lg border border-white bg-white px-8 py-3.5 font-sans text-sm font-medium text-royal-blue transition-colors hover:bg-white/90"
          >
            Contact Us
          </Link>
        </div>
      </section>
      </div>
    </div>
  )
}
