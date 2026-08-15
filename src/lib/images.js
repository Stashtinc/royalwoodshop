/** Shared by the admin and the public site. No imports — safe on both sides. */

/** The widths we generate. A profile drawing on a catalogue card is ~300px on
 *  a phone and ~480px on a desktop grid; the detail page goes to ~900px. */
export const WIDTHS = [320, 640, 960, 1440]

const isLocal = (key) => typeof key === 'string' && key.startsWith('/uploads/')

/** Variant path for a generated width: /uploads/foo.webp -> /uploads/foo-640.webp */
export function variantPath(storageKey, width) {
  const dot = storageKey.lastIndexOf('.')
  return `${storageKey.slice(0, dot)}-${width}${storageKey.slice(dot)}`
}

/**
 * Builds a srcset from the widths that actually exist.
 *
 * Images carried over from the old site are absolute URLs with no variants, so
 * they return null and the plain src is used — no broken requests.
 */
export function srcSet(storageKey, originalWidth) {
  if (!isLocal(storageKey) || storageKey.endsWith('.svg')) return null
  const available = WIDTHS.filter((w) => !originalWidth || w <= originalWidth)
  if (!available.length) return null
  return available.map((w) => `${variantPath(storageKey, w)} ${w}w`).join(', ')
}

/** Small enough for a thumbnail, without downloading the full image. */
export function thumbSrc(storageKey, originalWidth) {
  if (!isLocal(storageKey) || storageKey.endsWith('.svg')) return storageKey
  return !originalWidth || originalWidth >= 320 ? variantPath(storageKey, 320) : storageKey
}


/**
 * How an image should sit in its frame.
 *
 * Profile drawings are line art on white: show the whole thing, never crop, or
 * the detail a customer is reading gets cut off. Photographs fill the frame —
 * letterboxing a photograph on white looks like a mistake.
 */
export function imageFit(role) {
  return role === 'profile_drawing' || !role
    ? { className: 'object-contain', pad: true }
    : { className: 'object-cover', pad: false }
}
