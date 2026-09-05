import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { srcSet, thumbSrc, imageFit } from '../lib/images'
import {
  productPath, catalogueProducts as snapshotProducts,
  categoryTree, speciesFacet, availabilityFacet, availabilityKeys, CATEGORY_BY_SLUG,
} from '../data/catalogue'

const DEFAULT_PAGE_SIZE = 16

/**
 * The sidebar selection implied by the URL.
 *
 * Two ways in, both landing in the same place:
 *   /products?category=interior-doors   — the Products menu
 *   /products/interior-doors            — the category route, via initialCategory
 *
 * Selecting a category means ticking every subcategory under it, because that
 * is what the sidebar's own category checkbox does; this keeps a menu click and
 * a click in the sidebar producing an identical state rather than two similar
 * ones.
 *
 * Comma-separated slugs are accepted so /products?category=a,b is possible
 * later without changing the contract.
 */
function allSubKeys(tree) {
  const keys = new Set()
  for (const cat of tree) {
    for (const sub of cat.subcategories) keys.add(`${cat.name}::${sub}`)
  }
  return keys
}

function subsFromUrl({ initialCategory, categoryParam, tree }) {
  const wanted = new Set()
  if (initialCategory) wanted.add(initialCategory)
  for (const slug of (categoryParam || '').split(',')) {
    const name = CATEGORY_BY_SLUG[slug.trim()]
    if (name) wanted.add(name)
  }

  // No filter specified → all categories selected
  if (wanted.size === 0) return allSubKeys(tree)

  const keys = new Set()
  for (const cat of tree) {
    if (!wanted.has(cat.name)) continue
    for (const sub of cat.subcategories) keys.add(`${cat.name}::${sub}`)
  }
  return keys
}

const countBy = (rows) => rows.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] || 0) + 1
  const subKey = `${product.category}::${product.subcategory}`
  counts[subKey] = (counts[subKey] || 0) + 1
  return counts
}, {})

function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleKey(e) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2.5 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ maxHeight: '240px' }}
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`cursor-pointer px-3 py-2 font-sans text-sm transition-colors hover:bg-gray-50 ${o.value === value ? 'font-semibold text-royal-blue' : 'text-gray-900'}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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

const AVAILABILITY_PILL = {
  in_stock:      { label: 'In Stock',       className: 'bg-green-100 text-green-800' },
  quick_ship:    { label: 'Quick Ship',     className: 'bg-amber-100 text-amber-800' },
  made_to_order: { label: 'Made-to-Order',  className: 'bg-gray-100 text-gray-600' },
}

function AvailabilityPill({ availability, className = '' }) {
  if (!availability) return null
  const pill = AVAILABILITY_PILL[availability]
  if (!pill) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${pill.className} ${className}`}>
      {pill.label}
    </span>
  )
}

function ProductCard({ product }) {
  return (
    <Link
      to={productPath(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow duration-300 hover:shadow-lg"
    >
      {/* Profile drawings are wide technical illustrations — contain, never
          crop, or the detail a customer is reading gets cut off. */}
      <div className={`aspect-[4/3] w-full overflow-hidden bg-white ${imageFit(product.imageRole).pad ? 'p-4' : ''}`}>
        <img
          src={product.image}
          srcSet={srcSet(product.image, product.imageWidth) ?? undefined}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
          alt={`${product.name}${product.productCode ? ` (${product.productCode})` : ''} profile drawing`}
          loading="lazy"
          className={`h-full w-full ${imageFit(product.imageRole).className} transition-transform duration-300 group-hover:scale-105`}
        />
      </div>
      {(availabilityKeys(product).length > 0 || product.salePrice) && (
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.salePrice && (
            <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-0.5 font-sans text-xs font-medium text-white">
              On Sale
            </span>
          )}
          {availabilityKeys(product).map((key) => (
            <AvailabilityPill key={key} availability={key} />
          ))}
        </div>
      )}
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
        <img src={thumbSrc(product.image, product.imageWidth)} alt={`${product.name}${product.productCode ? ` (${product.productCode})` : ''} profile drawing`} loading="lazy" className="h-full w-full object-contain" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <p className="font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
          {product.subcategory}
        </p>
        <p className="font-serif text-lg leading-snug font-medium text-tundora">{product.name}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-sans text-sm text-gray-500">
          <p>
            <span className="font-medium text-gray-700">Product Code </span>
            {product.productCode}
          </p>
          <p>
            <span className="font-medium text-gray-700">Size </span>
            {product.size}
          </p>
          {product.availability
            ? <AvailabilityPill availability={product.availability} />
            : product.material && (
              <p>
                <span className="font-medium text-gray-700">Material </span>
                {product.material}
              </p>
            )}
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
  // Seeded from initialCategory only — never from the query string. /products
  // is prerendered without one, so reading ?category= here would make the
  // client's first render disagree with the served HTML and trip a hydration
  // mismatch. The effect below applies it a beat later instead.
  const [selectedSubs, setSelectedSubs] = useState(() =>
    subsFromUrl({ initialCategory, categoryParam: null, tree: categoryTree(allProducts) }),
  )
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [view, setView] = useState('grid')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const resultsRef = useRef(null)
  const sidebarRef = useRef(null)

  useEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height
      // Grid: ~300px per card row. Use 4 cols at lg, 2 at smaller — assume 4.
      // List: ~120px per row.
      const rowHeight = view === 'list' ? 128 : 300
      const cols = view === 'list' ? 1 : 4
      const rows = Math.max(2, Math.ceil(h / rowHeight))
      setPageSize(rows * cols)
    })
    obs.observe(sidebar)
    return () => obs.disconnect()
  }, [view])

  // A search result link can deep-link straight to a product via ?code=; re-sync
  // if the query param changes while already on this page (client-side nav).
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setProductCode(code)
      setPage(1)
    }
  }, [searchParams])

  // Same for the category. The URL is the source of truth for which categories
  // are ticked, so navigating from Products > Interior Doors to Products >
  // Door Hardware replaces the selection rather than adding to it — and
  // "Full Product Catalogue" (no param) clears it. Manual clicks in the
  // sidebar do not touch the URL, so they are never clobbered by this.
  const categoryParam = searchParams.get('category')
  useEffect(() => {
    setSelectedSubs(
      subsFromUrl({ initialCategory, categoryParam, tree: catalogueCategoryOrder }),
    )
    setPage(1)
  }, [categoryParam, initialCategory, catalogueCategoryOrder])

  function withPageReset(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  function toggleSub(category, sub) {
    const key = `${category}::${sub}`
    setSelectedSubs((prev) => {
      // If this sub is already the only thing selected, restore all
      if (prev.size === 1 && prev.has(key)) return allSubKeys(catalogueCategoryOrder)
      // Otherwise exclusively select just this sub across all categories
      return new Set([key])
    })
    setPage(1)
  }

  function toggleCategory(category, subs) {
    setSelectedSubs((prev) => {
      const keys = subs.map((sub) => `${category}::${sub}`)
      const allOfCatSelected = keys.every((key) => prev.has(key))

      if (allOfCatSelected) {
        // Deselect this category
        const next = new Set(prev)
        keys.forEach((k) => next.delete(k))
        // If nothing left, restore all
        return next.size === 0 ? allSubKeys(catalogueCategoryOrder) : next
      }
      // Select all subs of this category (add to existing selection)
      const next = new Set(prev)
      keys.forEach((k) => next.add(k))
      return next
    })
    setPage(1)
  }

  function toggleExpanded(catName) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(catName)) next.delete(catName)
      else next.add(catName)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setProductCode('')
    setSizeCategory('All')
    setSpecies('All')
    setAvailability('All')
    setSelectedSubs(allSubKeys(catalogueCategoryOrder))
    setPage(1)
  }

  const totalSubCount = useMemo(
    () => catalogueCategoryOrder.reduce((s, cat) => s + cat.subcategories.length, 0),
    [catalogueCategoryOrder],
  )

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(productCode.trim()) ||
    sizeCategory !== 'All' ||
    species !== 'All' ||
    availability !== 'All' ||
    selectedSubs.size < totalSubCount

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
      // Availability is per species, so a profile in stock in poplar and made
      // to order in walnut answers to both filters.
      if (availability !== 'All' && !availabilityKeys(product).includes(availability)) return false
      if (!selectedSubs.has(`${product.category}::${product.subcategory}`)) return false
      return true
    })
  }, [allProducts, search, productCode, sizeCategory, species, availability, selectedSubs])

  const sorted = useMemo(() => {
    const catIndex = Object.fromEntries(catalogueCategoryOrder.map((c, i) => [c.name, i]))
    return [...filtered].sort((a, b) => (catIndex[a.category] ?? 99) - (catIndex[b.category] ?? 99))
  }, [filtered, catalogueCategoryOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
            Products Catalogue
          </h1>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Browse The Royal Wood Shop&rsquo;s selection of in-stock mouldings, trim profiles, and
            interior doors. Find the right products for your renovation, build, or finishing
            project &mdash; all available for pickup or delivery across Toronto and the GTA.
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <aside ref={sidebarRef} className="flex w-full shrink-0 flex-col gap-8 lg:sticky lg:top-28 lg:w-[280px]">
            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Product Search</p>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => withPageReset(setSearch)(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-8 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => withPageReset(setSearch)('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="flex w-fit items-center gap-1 font-sans text-sm text-royal-blue hover:underline"
              >
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform duration-200 ${advancedOpen ? 'rotate-90' : ''}`}
                >
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Advanced search
              </button>
              {advancedOpen && (
                <div className="flex flex-col gap-4 pt-1">
                  <div className="flex flex-col gap-2">
                    <p className="font-serif text-base font-bold text-tundora">Product Code</p>
                    <div className="relative">
                      <input
                        type="text"
                        value={productCode}
                        onChange={(e) => withPageReset(setProductCode)(e.target.value)}
                        placeholder="e.g. BB-5014"
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-8 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                      />
                      {productCode && (
                        <button
                          type="button"
                          onClick={() => withPageReset(setProductCode)('')}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label="Clear product code"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-serif text-base font-bold text-tundora">Width</p>
                    <CustomSelect
                      value={sizeCategory}
                      onChange={withPageReset(setSizeCategory)}
                      options={[
                        { value: 'All', label: 'All' },
                        { value: 'Under 2"', label: 'Under 2"' },
                        { value: '2" – 4"', label: '2" – 4"' },
                        { value: '4" – 7"', label: '4" – 7"' },
                        { value: 'Over 7"', label: 'Over 7"' },
                        { value: 'Made to order', label: 'Made to order' },
                      ]}
                    />
                  </div>
                  {speciesOptions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="font-serif text-base font-bold text-tundora">Wood species</p>
                      <CustomSelect
                        value={species}
                        onChange={withPageReset(setSpecies)}
                        options={[
                          { value: 'All', label: 'All' },
                          ...speciesOptions.map((o) => ({ value: o.value, label: `${o.value} (${o.count})` })),
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <p className="font-serif text-base font-bold text-tundora">Categories</p>
              <div className="flex flex-col">
                {catalogueCategoryOrder.map((cat) => {
                  const keys = cat.subcategories.map((sub) => `${cat.name}::${sub}`)
                  const catChecked = keys.length > 0 && keys.every((key) => selectedSubs.has(key))
                  const hasAnySelected = keys.some((key) => selectedSubs.has(key))
                  const isOpen = hasAnySelected || expandedCats.has(cat.name)
                  return (
                    <div key={cat.name} className="border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-2 py-2.5">
                        <input
                          type="checkbox"
                          checked={catChecked}
                          onChange={() => toggleCategory(cat.name, cat.subcategories)}
                          className="h-4 w-4 shrink-0 rounded border-gray-300 accent-royal-blue"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cat.name)}
                          className="flex flex-1 items-center justify-between gap-1 text-left font-sans text-sm font-semibold text-tundora hover:text-royal-blue"
                        >
                          <span>
                            {cat.name}{' '}
                            <span className="font-normal text-gray-400">({categoryCounts[cat.name] || 0})</span>
                          </span>
                          <svg
                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                            className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      {isOpen && (
                        <div className="flex flex-col gap-1.5 pb-2.5 pl-6">
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
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Product Code</p>
              <div className="relative">
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => withPageReset(setProductCode)(e.target.value)}
                  placeholder="e.g. BB-5014"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-8 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                />
                {productCode && (
                  <button
                    type="button"
                    onClick={() => withPageReset(setProductCode)('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear product code"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>



            <div className="flex flex-col gap-3">
              <p className="font-serif text-base font-bold text-tundora">Width</p>
              <CustomSelect
                value={sizeCategory}
                onChange={withPageReset(setSizeCategory)}
                options={[
                  { value: 'All', label: 'All' },
                  { value: 'Under 2"', label: 'Under 2"' },
                  { value: '2" – 4"', label: '2" – 4"' },
                  { value: '4" – 7"', label: '4" – 7"' },
                  { value: 'Over 7"', label: 'Over 7"' },
                  { value: 'Made to order', label: 'Made to order' },
                ]}
              />
            </div>

            {speciesOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="font-serif text-base font-bold text-tundora">Wood species</p>
                <CustomSelect
                  value={species}
                  onChange={withPageReset(setSpecies)}
                  options={[
                    { value: 'All', label: 'All' },
                    ...speciesOptions.map((o) => ({ value: o.value, label: `${o.value} (${o.count})` })),
                  ]}
                />
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
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-sans text-sm text-gray-500">
                  {filtered.length} product{filtered.length === 1 ? '' : 's'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'All', label: 'All' },
                    { key: 'in_stock', label: 'In Stock' },
                    { key: 'quick_ship', label: 'Quick Ship' },
                    { key: 'made_to_order', label: 'Made to Order' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => withPageReset(setAvailability)(key)}
                      className={`rounded-full px-3 py-1 font-sans text-xs transition-colors ${
                        availability === key
                          ? 'bg-royal-blue text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
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
                {selectedSubs.size === 0 ? (
                  <>
                    <p className="font-serif text-xl font-bold text-tundora">Please select items from our catalogue or use search</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-2 rounded-lg border border-royal-blue bg-royal-blue px-5 py-2.5 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
                    >
                      Show all products
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-xl font-bold text-tundora">No products match your filters</p>
                    <p className="font-sans text-gray-500">Try adjusting or clearing your search and filters.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-2 rounded-lg border border-royal-blue bg-royal-blue px-5 py-2.5 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
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
