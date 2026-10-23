/**
 * Purchase increment (also "purchase multiple"): the length, in feet, that a
 * linear-foot product is bought and quoted in. A 16' increment means the
 * quantity must be 16, 32, 48 … A blank increment means any whole quantity.
 */

/** A sheet or form value to a positive number of feet, or null when blank or not a number. */
export function parseIncrement(v) {
  const n = Number.parseFloat(String(v ?? '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Whether a quantity is a whole multiple of the increment. */
export function isMultiple(qty, increment) {
  if (!increment) return true
  const ratio = qty / increment
  return Math.abs(ratio - Math.round(ratio)) < 1e-9
}

/** "16" or "12.5", as shown to people. */
export const formatIncrement = (increment) => String(Number(increment))
