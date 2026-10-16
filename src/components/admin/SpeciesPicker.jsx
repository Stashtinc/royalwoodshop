import { useRef, useState } from 'react'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'
import { useConfirm } from './ConfirmDialog'

// `large` matches the page's standard fields (Lead time etc.), for the Other row.
const AvailSelect = ({ name, defaultValue, large = false }) => (
  <select
    name={name}
    defaultValue={defaultValue ?? ''}
    className={large
      ? 'rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm text-gray-700 outline-none focus:border-royal-blue'
      : 'rounded border border-gray-300 py-0.5 pl-2 pr-6 text-xs text-gray-700 outline-none focus:border-royal-blue'}
  >
    <option value="">— not milled —</option>
    <option value="none_set">milled, no code</option>
    {AVAILABILITY.map(([key, label]) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
)

/** Flex is listed with the species, where the Master Product List puts it
 *  (between PVC and Steel). It has no "milled, no code" state: on the sheet a
 *  Flex cell is either a code or blank. Submitted as `flexAvailability`. */
const FlexSelect = ({ defaultValue }) => (
  <select
    name="flexAvailability"
    defaultValue={defaultValue ?? ''}
    className="rounded border border-gray-300 py-0.5 pl-2 pr-6 text-xs text-gray-700 outline-none focus:border-royal-blue"
  >
    <option value="">— not available —</option>
    {AVAILABILITY.map(([key, label]) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
)

const FIELD = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'
const PRICE_OK = (v) => v == null || /^\d+(\.\d{1,2})?$/.test(v)

/** "+ Add Species": a wood that is not in the standard list, with its own price. */
function SpeciesDialog({ taken, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [avail, setAvail] = useState('')
  const [price, setPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [error, setError] = useState(null)

  const submit = () => {
    const n = name.trim().replace(/\s+/g, ' ')
    const money = (v) => v.trim().replace(/[$,\s]/g, '') || null
    const p = money(price)
    const sp = money(salePrice)
    if (!n) return setError('Enter a name.')
    if (taken.some((t) => t.toLowerCase() === n.toLowerCase())) return setError(`${n} is already listed.`)
    if (!PRICE_OK(p) || !PRICE_OK(sp)) return setError('Prices must be numbers, like 12.50.')
    onAdd({ name: n, avail, price: p, salePrice: sp })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Add Species"
        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-lg font-bold text-tundora">Add Species</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Availability
            <select value={avail} onChange={(e) => setAvail(e.target.value)} className={FIELD}>
              <option value="">— not milled —</option>
              <option value="none_set">milled, no code</option>
              {AVAILABILITY.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Price
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Sale Price
              <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} inputMode="decimal" className={FIELD} />
            </label>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">
            Cancel
          </button>
          <button type="button" onClick={submit}
            className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Per-species availability picker.
 *
 * Standard species: each gets a select submitted as `species:${name}`.
 * Other: one or more rows, each submitted as other_species_name /
 *   other_species_avail (same names repeated — f.getAll() reads them in order).
 *
 * initialAvail: { [speciesName]: availabilityKey | null }
 * initialOther: [{ name, avail }, ...] for non-standard species
 * initialFlex:  availability key or null
 */
export default function SpeciesPicker({ initialAvail = {}, initialOther = [], initialFlex = null, initialPartIds = {}, initialPartPrices = {}, initialPartSalePrices = {} }) {
  const seed = [0]
  const [rows, setRows] = useState(seed)
  const nextId = useRef(seed.length)
  // Species added earlier (saved as non-standard) load back as grid cells, not Other rows.
  const [subs, setSubs] = useState(() => initialOther.map((o) => ({ name: o.name, avail: o.avail ?? "" })))
  const [adding, setAdding] = useState(false)
  // Standard species that were removed: their cells are blank. gen bumps remount a cell.
  const [cleared, setCleared] = useState(() => new Set())
  const [removed, setRemoved] = useState([])
  const [gen, setGen] = useState({})
  const [confirm, confirmDialog] = useConfirm()

  const addRow = () => {
    setRows((r) => [...r, nextId.current++])
  }
  const removeRow = (id) => {
    setRows((r) => r.filter((x) => x !== id))
  }

  const removeSpecies = (s) => {
    if (subs.some((x) => x.name === s)) {
      setSubs((list) => list.filter((x) => x.name !== s))
      // Sent on save so the species Part ID row (and its price) is cleared too.
      setRemoved((r) => [...new Set([...r, s])])
    } else {
      setCleared((c) => new Set([...c, s]))
      setGen((g) => ({ ...g, [s]: (g[s] ?? 0) + 1 }))
    }
  }
  const askRemove = async (s) => {
    if (await confirm({ title: `Remove ${s}?`, message: `Are you sure you want to remove ${s}?`, action: 'Remove' })) removeSpecies(s)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...SPECIES.flatMap((s) => (s === 'Steel' ? ['Flex', s] : [s])), ...subs.map((x) => x.name)].map((s) => {
          const isFlex = s === 'Flex'
          // A species added with the dialog has no standard entry; its cell starts from what was entered.
          const sub = subs.find((x) => x.name === s)
          // A cleared species (removed, not added as a custom one) remounts blank.
          const blank = cleared.has(s)
          const pick = (v) => (blank ? '' : v)
          const current = isFlex ? (blank ? null : initialFlex ?? null) : blank ? null : sub ? (sub.avail ?? '') : s in initialAvail ? (initialAvail[s] ?? '') : null
          return (
            <div key={`${s}:${gen[s] ?? 0}`} className="group flex flex-col gap-1">
              <label className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1 text-sm ${current !== null ? 'text-gray-800' : 'text-gray-400'}`}>
                  {s}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); askRemove(s) }}
                    title={`Remove ${s}`}
                    aria-label={`Remove ${s}`}
                    className="text-base leading-none text-gray-400 opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                  >
                    ×
                  </button>
                </span>
                {isFlex
                  ? <FlexSelect defaultValue={blank ? null : initialFlex} />
                  : <AvailSelect name={`species:${s}`} defaultValue={current} />}
              </label>
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  name={`partId:${s}`}
                  defaultValue={pick(initialPartIds[s] ?? '')}
                  placeholder="Part ID"
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 outline-none focus:border-royal-blue"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name={`partPrice:${s}`}
                    defaultValue={pick(initialPartPrices[s] ?? sub?.price ?? '')}
                    placeholder="Price"
                    inputMode="decimal"
                    className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 outline-none focus:border-royal-blue"
                  />
                  <input
                    type="text"
                    name={`partSalePrice:${s}`}
                    defaultValue={pick(initialPartSalePrices[s] ?? sub?.salePrice ?? '')}
                    placeholder="Sale Price"
                    inputMode="decimal"
                    className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 outline-none focus:border-royal-blue"
                  />
                </div>
              </div>
            </div>
          )
        })}
        {/* Add Species — a wood with its own availability and price; saved with the product */}
        <div className="flex items-start">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add Species
          </button>
        </div>
      </div>
      {removed.map((n) => <input key={n} type="hidden" name="removed_species" value={n} />)}
      {confirmDialog}
      {adding && (
        <SpeciesDialog
          taken={[...SPECIES, ...subs.map((s) => s.name)]}
          onCancel={() => setAdding(false)}
          onAdd={(sub) => { setSubs((list) => [...list, sub]); setAdding(false) }}
        />
      )}

      {/* Other — for species not in the standard list, supports multiple rows */}
      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Other</span>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add
          </button>
        </div>
        {rows.map((id, idx) => (
          <div key={id} className="flex items-center gap-2">
            <input
              name="other_species_name"
              defaultValue=""
              placeholder="Species name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue"
            />
            <AvailSelect name="other_species_avail" defaultValue="" large />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(id)}
                className="shrink-0 text-gray-400 hover:text-red-500"
                title="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Read per-species availability from FormData submitted by SpeciesPicker. */
export function readSpeciesAvail(f) {
  const species = []
  const speciesAvail = {}

  for (const [key, value] of f.entries()) {
    if (!key.startsWith('species:') || !value || value === '') continue
    const name = key.slice('species:'.length)
    species.push(name)
    speciesAvail[name] = value === 'none_set' ? null : value
  }

  // Other species rows (same field name repeated, read in order)
  const otherNames = f.getAll('other_species_name').map(String)
  const otherAvails = f.getAll('other_species_avail').map(String)
  for (let i = 0; i < otherNames.length; i++) {
    const name = otherNames[i].trim()
    const avail = otherAvails[i]
    if (name) {
      species.push(name)
      speciesAvail[name] = avail === 'none_set' || !avail || avail === '' ? null : avail
    }
  }

  const flex = String(f.get('flexAvailability') ?? '')
  const flexAvailability = AVAILABILITY.some(([key]) => key === flex) ? flex : null

  return { species, speciesAvail, flexAvailability }
}

/**
 * Part ID, price and sale price per wood from FormData submitted by
 * SpeciesPicker: { entries: { [wood]: { partId, price, salePrice } }, error }.
 */
export function readPartEntries(f) {
  const entries = {}
  const text = (k) => String(f.get(k) ?? '').trim() || null
  const money = (k) => text(k)?.replace(/[$,\s]/g, '') || null
  for (const key of f.keys()) {
    if (!key.startsWith('partId:')) continue
    const wood = key.slice('partId:'.length)
    entries[wood] = {
      partId: text(key)?.toUpperCase() ?? null,
      price: money(`partPrice:${wood}`),
      salePrice: money(`partSalePrice:${wood}`),
    }
  }
  // Removed custom species: an empty entry clears their Part ID row, unless the form sent one again.
  for (const n of f.getAll("removed_species").map((x) => String(x).trim())) {
    if (n && !(n in entries)) entries[n] = { partId: null, price: null, salePrice: null }
  }
  const bad = Object.entries(entries).find(([, e]) =>
    [e.price, e.salePrice].some((v) => v != null && !/^\d+(\.\d{1,2})?$/.test(v)))
  return { entries, error: bad ? `${bad[0]}: prices must be numbers, like 12.50.` : null }
}
