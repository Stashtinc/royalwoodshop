/** Shared by the admin UI and the server. Deliberately free of imports so it
 *  can be used on both sides without pulling anything with it. */

/** Order matters: it is the sort order of the species filter on the site, and
 *  it mirrors the column order on the audit sheet so the two read alike. */
export const SPECIES = [
  'Poplar', 'FJ Primed Poplar', 'FJ Primed Pine', 'Clear Pine', 'Knotty Pine',
  'Primed MDF', 'White Oak', 'Red Oak', 'Hard Maple', 'Black Walnut', 'Mahogany',
  'Douglas Fir', 'Western Red Cedar', 'PVC', 'Steel', 'Plastic',
]

export const AVAILABILITY = [
  ['in_stock', 'In Stock'],
  ['quick_ship', 'Quick Ship'],
  ['made_to_order', 'Made-to-Order'],
]

export const AVAILABILITY_LABEL = Object.fromEntries(AVAILABILITY)

/** What Royal Wood Shop type into a species column on the audit sheet. The
 *  tick says both "milled in this wood" and "and this is how it ships". */
export const TICK_CODES = [
  ['X', 'in_stock'],
  ['QS', 'quick_ship'],
  ['MTO', 'made_to_order'],
]

/** Best first. A product's own availability is the best of its species: if a
 *  profile is in stock in any wood, the catalogue should find it under
 *  In Stock, and the per-species detail says which wood. */
export const AVAILABILITY_RANK = ['in_stock', 'quick_ship', 'made_to_order']

export function bestAvailability(values) {
  for (const key of AVAILABILITY_RANK) if (values.includes(key)) return key
  return null
}
