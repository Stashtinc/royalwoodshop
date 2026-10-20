import { useEffect, useMemo, useRef, useState } from 'react'
import { AVAILABILITY, AVAILABILITY_LABEL } from '../../lib/catalogue-constants'
import Thumb from './Thumb'

/**
 * Dropdown product list for the quote form: search, filters, and multi-select.
 *
 * Ticked products are added together with "Add to quote". Products already on
 * the quote show as added and cannot be ticked twice.
 */

const field =
  'rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm focus:border-royal-blue focus:outline-none'

export default function ProductPicker({ products, addedIds, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [species, setSpecies] = useState('')
  const [availability, setAvailability] = useState('')
  const [ticked, setTicked] = useState(() => new Set())
  const rootRef = useRef(null)

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.categoryName).filter(Boolean))].sort(),
    [products],
  )
  const speciesList = useMemo(
    () => [...new Set(products.flatMap((p) => p.species ?? []))].sort(),
    [products],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category && p.categoryName !== category) return false
      if (species && !(p.species ?? []).includes(species)) return false
      if (availability && p.availability !== availability) return false
      if (!q) return true
      return `${p.name} ${p.productCode ?? ''} ${p.sizeDisplay ?? ''}`.toLowerCase().includes(q)
    })
  }, [products, query, category, species, availability])

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (id) => setTicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const addTicked = () => {
    onAdd(products.filter((p) => ticked.has(p.id)))
    setTicked(new Set())
  }

  const filtersActive = Boolean(category || species || availability)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-left font-sans text-sm text-gray-700 hover:border-gray-400"
      >
        <span>Choose products from the catalogue</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className={open ? 'rotate-180' : ''}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-2 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code or size"
              aria-label="Search products"
              className={`${field} w-full`}
              autoFocus
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={field}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={species} onChange={(e) => setSpecies(e.target.value)} aria-label="Filter by species" className={field}>
                <option value="">All species</option>
                {speciesList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filter by availability" className={field}>
                <option value="">Any availability</option>
                {AVAILABILITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={() => { setCategory(''); setSpecies(''); setAvailability('') }}
                className="w-fit font-sans text-xs text-royal-blue hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Products">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center font-sans text-sm text-gray-500">No products match. Try another search or filter.</li>
            )}
            {results.map((p) => {
              const added = addedIds.has(p.id)
              const checked = ticked.has(p.id)
              return (
                <li key={p.id} role="option" aria-selected={checked} aria-disabled={added}>
                  <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-parchment ${added ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked || added}
                      disabled={added}
                      onChange={() => toggle(p.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-royal-blue"
                    />
                    <Thumb product={p} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-sans text-sm font-medium text-gray-900">{p.name}</span>
                      <span className="font-sans text-xs text-gray-500">
                        {[p.productCode, p.sizeDisplay, p.categoryName, AVAILABILITY_LABEL[p.availability]].filter(Boolean).join(' · ')}
                        {added && ' · on your quote'}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-4">
            <span className="font-sans text-sm text-gray-600">{ticked.size} selected</span>
            <button
              type="button"
              onClick={addTicked}
              disabled={ticked.size === 0}
              className="rounded-lg bg-royal-blue px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40"
            >
              Add to quote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
