import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'

/**
 * Per-species availability picker used in both Add New and Edit forms.
 *
 * Each species gets a small select:
 *   "— not milled —"  → field omitted from submission (species not set)
 *   "In Stock" etc.   → field submitted as `species:${name}` = availability key
 *
 * initialAvail: { [speciesName]: availabilityKey | null }
 *   A null value means the species is ticked but with no specific availability code.
 */
export default function SpeciesPicker({ initialAvail = {} }) {
  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {SPECIES.map((s) => {
        const current = s in initialAvail ? (initialAvail[s] ?? '') : null
        return (
          <label key={s} className="flex items-center justify-between gap-2">
            <span className={`text-sm ${current !== null ? 'text-gray-800' : 'text-gray-400'}`}>
              {s}
            </span>
            <select
              name={`species:${s}`}
              defaultValue={current ?? ''}
              className="rounded border border-gray-300 py-0.5 pl-2 pr-6 text-xs text-gray-700 outline-none focus:border-royal-blue"
            >
              <option value="">— not milled —</option>
              <option value="none_set">milled, no code</option>
              {AVAILABILITY.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        )
      })}
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
  return { species, speciesAvail }
}
