import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  productPath, catalogueProducts as snapshotProducts,
  categoryTree, speciesFacet, availabilityFacet,
} from '../data/catalogue'

const PAGE_SIZE = 8

const countBy = (rows) => rows.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] || 0) + 1
  const subKey = `${product.category}::${product.subcategory}`
  counts[subKey] = (counts[subKey] || 0) + 1
  return counts
}, {})

function SearchIcon({ className = '' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12.7" y1="12.7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="1" y="7" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="1" y="12" width="14" height="3" rx="1" fill="currentColor" />
    </svg>
  )
}

function PaginationControls({ page, totalPages, onChange }) {
  const buttonClasses =
    'flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:border-royal-blue hover:text-royal-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500'

  return (
    <div className="flex items-center gap-3 font-sans text-sm text-gray-500">
      <span className="whitespace-nowrap">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={buttonClasses}
          aria-label="Previous page"
        >
          &lsaquo;
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={buttonClasses}
          aria-label="Next page"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <Link
      to={productPath(product)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg"
    >
      {/* Profile drawings are wide technical illustrations — contain, never
          crop, or the detail a customer is reading gets cut off. */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-white p-4">
        <img
          src={product.image}
          alt={`${product.name}${product.productCode ? ` (${product.productCode})` : ''} profile drawing`}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
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

function ProductRow({ product }) {
  return (
    <Link
      to={productPath(product)}
      className="group flex gap-5 rounded-2xl border border-gray-100 bg-white p-4 transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-white p-2">
        <img src={product.image} alt={`${product.name}${product.productCode ? ` (${product.productCode})` : ''} profile drawing`} loading="lazy" className="h-full w-full object-contain" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <p className="font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
          {product.subcategory}
        </p>
        <p className="font-serif text-lg leading-snug font-medium text-tundora">{product.name}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-0.5 font-sans text-sm text-gray-500">
          <p>
            <span className="font-medium text-gray-700">Product Code </span>
            {product.productCode}
          </p>
          <p>
            <span className="font-medium text-gray-700">Size </span>
            {product.size}
          </p>
          <p>
            <span className="font-medium text-gray-700">Material </span>
            {product.availabilityLabel ?? product.material}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function Catalogue({ initialCategory = null, products = null }) {
  // Products come from the loader (Postgres at build time). The snapshot is the
  // fallback so this component still renders on its own.
  const allProducts = products ?? snapshotProducts
  const categoryCounts = useMemo(() => countBy(allProducts), [allProducts])
  const catalogueCategoryOrder = useMemo(() => categoryTree(allProducts), [allProducts])
  const speciesOptions = useMemo(() => speciesFacet(allProducts), [allProducts])
  const availabilityOptions = useMemo(() => availabilityFacet(allProducts), [allProducts])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [productCode, setProductCode] = useState(() => searchParams.get('code') || '')
  const [sizeCategory, setSizeCategory] = useState('All')
  const [species, setSpecies] = useState('All')
  const [availability, setAvailability] = useState('All')
  const [selectedSubs, setSelectedSubs] = useState(() => new Set())
  const [page, setPage] = useState(1)
  const [view, setView] = useState('grid')
  const resultsRef = useRef(null)

  // A search result link can deep-link straight to a product via ?code=; re-sync
  // if the query param changes while already on this page (client-side nav).
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setProductCode(code)
      setPage(1)
    }
  }, [searchParams])

  function withPageReset(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  function toggleSub(category, sub) {
    const key = `${category}::${sub}`
    setSelectedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setPage(1)
  }

  function toggleCategory(category, subs) {
    setSelectedSubs((prev) => {
      const keys = subs.map((sub) => `${category}::${sub}`)
      const allSelected = keys.every((key) => prev.has(key))
      const next = new Set(prev)
      keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)))
      return next
    })
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setProductCode('')
    setSizeCategory('All')
    setSpecies('All')
    setAvailability('All')
    setSelectedSubs(new Set())
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(productCode.trim()) ||
    sizeCategory !== 'All' ||
    species !== 'All' ||
    availability !== 'All' ||
    selectedSubs.size > 0

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    const codeTerm = productCode.trim().toLowerCase()

    return allProducts.filter((product) => {
      if (
        searchTerm &&
        !product.name.toLowerCase().includes(searchTerm) &&
        !product.productCode.toLowerCase().includes(searchTerm)
      ) {
        return false
      }
      if (codeTerm && !product.productCode.toLowerCase().includes(codeTerm)) return false
      if (sizeCategory !== 'All' && product.sizeCategory !== sizeCategory) return false
      if (species !== 'All' && !(product.species ?? []).includes(species)) return false
      if (availability !== 'All' && product.availability !== availability) return false
      if (selectedSubs.size > 0 && !selectedSubs.has(`${product.category}::${product.subcategory}`)) {
        return false
      }
      return true
    })
  }, [allProducts, search, productCode, sizeCategory, species, availability, selectedSubs])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const grouped = catalogueCategoryOrder
    .map((cat) => ({ name: cat.name, items: pageItems.filter((p) => p.category === cat.name) }))
    .filter((group) => group.items.length > 0)

  function goToPage(nextPage) {
    setPage(nextPage)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 lg:px-8">
        <div className="flex flex-col gap-5">
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            Trim, Mouldings &amp; Interior Doors Catalogue
          </h1>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Browse The Royal Wood Shop&rsquo;s selection of in-stock mouldings, trim profiles, and
            interior doors. Find the right products for your renovation, build, or finishing
            project &mdash; all available for pickup or delivery across Toronto and the GTA.
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <aside className="flex w-full shrink-0 flex-col gap-8 lg:sticky lg:top-28 lg:w-[280px]">
            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Product Search</p>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => withPageReset(setSearch)(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-gray-300 py-2.5 pr-3 pl-10 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="font-serif text-base font-bold text-tundora">Categories</p>
              <div className="flex flex-col gap-5">
                {catalogueCategoryOrder.map((cat) => {
                  const keys = cat.subcategories.map((sub) => `${cat.name}::${sub}`)
                  const catChecked = keys.length > 0 && keys.every((key) => selectedSubs.has(key))
                  return (
                    <div key={cat.name} className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 font-sans text-sm font-semibold text-tundora">
                        <input
                          type="checkbox"
                          checked={catChecked}
                          onChange={() => toggleCategory(cat.name, cat.subcategories)}
                          className="h-4 w-4 shrink-0 rounded border-gray-300 accent-royal-blue"
                        />
                        {cat.name}{' '}
                        <span className="font-normal text-gray-400">
                          ({categoryCounts[cat.name] || 0})
                        </span>
                      </label>
                      <div className="flex flex-col gap-1.5 pl-6">
                        {cat.subcategories.map((sub) => {
                          const key = `${cat.name}::${sub}`
                          return (
                            <label
                              key={sub}
                              className="flex cursor-pointer items-center gap-2 font-sans text-sm text-gray-600 hover:text-royal-blue"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSubs.has(key)}
                                onChange={() => toggleSub(cat.name, sub)}
                                className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-royal-blue"
                              />
                              {sub} <span className="text-gray-400">({categoryCounts[key] || 0})</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Product Code</p>
              <input
                type="text"
                value={productCode}
                onChange={(e) => withPageReset(setProductCode)(e.target.value)}
                placeholder="e.g. BB-5014"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
              />
            </div>

            {/* Availability first — a contractor working to a date filters on
                this before anything else. */}
            {availabilityOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="font-serif text-base font-bold text-tundora">Availability</p>
                <select
                  value={availability}
                  onChange={(e) => withPageReset(setAvailability)(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                >
                  <option value="All">All</option>
                  {availabilityOptions.map((o) => (
                    <option key={o.key} value={o.key}>{o.value} ({o.count})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Width</p>
              <select
                value={sizeCategory}
                onChange={(e) => withPageReset(setSizeCategory)(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
              >
                <option value="All">All</option>
                <option value='Under 2&quot;'>Under 2&quot;</option>
                <option value='2&quot; – 4&quot;'>2&quot; – 4&quot;</option>
                <option value='4&quot; – 7&quot;'>4&quot; – 7&quot;</option>
                <option value='Over 7&quot;'>Over 7&quot;</option>
                <option value="Made to order">Made to order</option>
              </select>
            </div>

            {/* Hidden until the species sheet comes back — an empty filter is
                worse than no filter. */}
            {speciesOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="font-serif text-base font-bold text-tundora">Wood species</p>
                <select
                  value={species}
                  onChange={(e) => withPageReset(setSpecies)(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                >
                  <option value="All">All</option>
                  {speciesOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-fit font-sans text-sm text-royal-blue underline underline-offset-2 hover:text-royal-blue-dark"
              >
                Clear all filters
              </button>
            )}
          </aside>

          <div ref={resultsRef} className="flex min-w-0 flex-1 scroll-mt-28 flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <p className="font-sans text-sm text-gray-500">
                {filtered.length} product{filtered.length === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                  <button
                    type="button"
                    aria-label="Grid view"
                    onClick={() => setView('grid')}
                    className={`rounded-md p-1.5 transition-colors ${
                      view === 'grid' ? 'bg-royal-blue text-white' : 'text-gray-400 hover:text-royal-blue'
                    }`}
                  >
                    <GridIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    onClick={() => setView('list')}
                    className={`rounded-md p-1.5 transition-colors ${
                      view === 'list' ? 'bg-royal-blue text-white' : 'text-gray-400 hover:text-royal-blue'
                    }`}
                  >
                    <ListIcon />
                  </button>
                </div>
                <PaginationControls page={currentPage} totalPages={totalPages} onChange={goToPage} />
              </div>
            </div>

            {grouped.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 py-20 text-center">
                <p className="font-serif text-xl font-bold text-tundora">No products match your filters</p>
                <p className="font-sans text-gray-500">Try adjusting or clearing your search and filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 rounded-lg border border-royal-blue bg-royal-blue px-5 py-2.5 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-12">
                {grouped.map((group) => (
                  <div key={group.name} className="flex flex-col gap-5">
                    <h2 className="font-serif text-xl font-bold text-royal-blue">{group.name}</h2>
                    {view === 'grid' ? (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {group.items.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {group.items.map((product) => (
                          <ProductRow key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {grouped.length > 0 && (
              <div className="flex justify-center border-t border-gray-200 pt-8">
                <PaginationControls page={currentPage} totalPages={totalPages} onChange={goToPage} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
