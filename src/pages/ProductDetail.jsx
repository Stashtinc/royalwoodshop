import { Link, useParams, useNavigate } from 'react-router-dom'
import { catalogueProducts } from '../data/catalogueProducts'

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RelatedCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = catalogueProducts.find((p) => p.id === id)

  if (!product) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-32 text-center">
        <p className="font-serif text-2xl font-bold text-tundora">Product not found</p>
        <p className="font-sans text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/trim-doors-catalogue"
          className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
        >
          Back to Catalogue
        </Link>
      </section>
    )
  }

  const related = catalogueProducts.filter(
    (p) => p.id !== product.id && p.subcategory === product.subcategory,
  ).slice(0, 4)

  const specs = [
    { label: 'Product Code', value: product.productCode },
    { label: 'Size', value: product.size },
    { label: 'Material', value: product.material },
    { label: 'Category', value: product.category },
    { label: 'Type', value: product.subcategory },
    { label: 'Availability', value: product.sizeCategory === 'Custom' ? 'Custom order' : 'In stock' },
  ]

  return (
    <div className="w-full bg-[#fbfbfb]">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-6 py-3 font-sans text-xs text-gray-400 lg:px-8">
          <Link to="/" className="transition-colors hover:text-royal-blue">Home</Link>
          <ChevronRight />
          <Link to="/trim-doors-catalogue" className="transition-colors hover:text-royal-blue">Catalogue</Link>
          <ChevronRight />
          <span className="text-tundora">{product.name}</span>
        </div>
      </div>

      {/* Main product section */}
      <section className="py-12 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* Image */}
            <div className="w-full shrink-0 lg:w-[480px]">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
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
                  {specs.map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-white p-3.5 border border-gray-100">
                      <dt className="font-sans text-xs font-semibold tracking-wide text-gray-400 uppercase">{label}</dt>
                      <dd className="font-sans text-sm font-medium text-tundora">{value}</dd>
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
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-sans text-sm font-medium text-tundora transition-colors hover:border-royal-blue hover:text-royal-blue"
                >
                  Back to Catalogue
                </button>
              </div>

              <p className="font-sans text-xs text-gray-400">
                Pricing is available upon request. Contact us for stock availability and delivery options across Toronto and the GTA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="border-t border-gray-200 py-12 lg:py-16">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-sans text-xs font-bold tracking-widest text-royal-blue uppercase">More like this</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-tundora">
                  Other {product.subcategory} Products
                </h2>
              </div>
              <Link
                to="/trim-doors-catalogue"
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
  )
}
