/** Shared by the admin UI and the server. Deliberately free of imports so it
 *  can be used on both sides without pulling anything with it. */

export const SPECIES = [
  'Poplar', 'FJ Primed Poplar', 'FJ Primed Pine', 'Clear Pine', 'Primed MDF',
  'White Oak', 'Red Oak', 'Hard Maple', 'Black Walnut', 'Douglas Fir',
  'Western Red Cedar', 'PVC', 'Steel', 'Plastic',
]

export const AVAILABILITY = [
  ['in_stock', 'In Stock'],
  ['quick_ship', 'Quick Ship'],
  ['special_order', 'Special Order'],
]
