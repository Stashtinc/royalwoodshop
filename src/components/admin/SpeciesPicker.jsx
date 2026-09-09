import { useRef, useState } from 'react'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'

const AvailSelect = ({ name, defaultValue }) => (
  <select
    name={name}
    defaultValue={defaultValue ?? ''}
    className="rounded border border-gray-300 py-0.5 pl-2 pr-6 text-xs text-gray-700 outline-none focus:border-royal-blue"
  >
    <option value="">— not milled —</option>
    <option value="none_set">milled, no code</option>
    {AVAILABILITY.map(([key, label]) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
)

/**
 * Per-species availability picker.
 *
 * Standard species: each gets a select submitted as `species:${name}`.
 * Other: one or more rows, each submitted as other_species_name /
 *   other_species_avail (same names repeated — f.getAll() reads them in order).
 *
 * initialAvail: { [speciesName]: availabilityKey | null }
 * initialOther: [{ name, avail }, ...] for non-standard species
 */
export default function SpeciesPicker({ initialAvail = {}, initialOther = [] }) {
  const seed = initialOther.length ? initialOther.map((_, i) => i) : [0]
  const [rows, setRows] = useState(seed)
  const nextId = useRef(seed.length)

  const addRow = () => {
    setRows((r) => [...r, nextId.current++])
  }
  const removeRow = (id) => {
    setRows((r) => r.filter((x) => x !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIES.map((s) => {
          const current = s in initialAvail ? (initialAvail[s] ?? '') : null
          return (
            <label key={s} className="flex items-center justify-between gap-2">
              <span className={`text-sm ${current !== null ? 'text-gray-800' : 'text-gray-400'}`}>
                {s}
              </span>
              <AvailSelect name={`species:${s}`} defaultValue={current} />
            </label>
          )
        })}
      </div>

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
              defaultValue={initialOther[idx]?.name ?? ''}
              placeholder="Species name"
              className="flex-1 rounded border border-gray-300 py-0.5 px-2 text-xs text-gray-700 outline-none focus:border-royal-blue"
            />
            <AvailSelect name="other_species_avail" defaultValue={initialOther[idx]?.avail ?? ''} />
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
    if (name && avail && avail !== '') {
      species.push(name)
      speciesAvail[name] = avail === 'none_set' ? null : avail
    }
  }

  return { species, speciesAvail }
}
