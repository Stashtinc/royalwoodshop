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
 * Per-species availability picker used in both Add New and Edit forms.
 *
 * Standard species: each gets a select submitted as `species:${name}`.
 * Other: free-text name field + availability select submitted as
 *   other_species_name / other_species_avail.
 *
 * initialAvail: { [speciesName]: availabilityKey | null }
 * initialOther: { name, avail } for any non-standard species
 */
export default function SpeciesPicker({ initialAvail = {}, initialOther = null }) {
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

      {/* Other — for species not in the standard list */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-500 shrink-0">Other</span>
        <input
          name="other_species_name"
          defaultValue={initialOther?.name ?? ''}
          placeholder="Species name"
          className="flex-1 rounded border border-gray-300 py-0.5 px-2 text-xs text-gray-700 outline-none focus:border-royal-blue"
        />
        <AvailSelect name="other_species_avail" defaultValue={initialOther?.avail ?? ''} />
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

  // Other species (free-text)
  const otherName = String(f.get('other_species_name') ?? '').trim()
  const otherAvail = String(f.get('other_species_avail') ?? '')
  if (otherName && otherAvail) {
    species.push(otherName)
    speciesAvail[otherName] = otherAvail === 'none_set' ? null : otherAvail
  }

  return { species, speciesAvail }
}
