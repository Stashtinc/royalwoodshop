import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { UPLOAD_DIRS } from './uploads.server.js'

/**
 * Spots the same picture at two resolutions — e.g. the old 245px WordPress
 * drawing beside the 640px profile-drawing-*.jpg — so a product only ever
 * keeps the sharper one.
 *
 * The comparison is on the picture, not the file name: trimmed to its
 * content on white, greyscale, 24×24. Copies of one drawing differ by under
 * 10; distinct images (a black and a nickel bracket) by over 20.
 */
const SAME = 10
const cache = new Map()

async function bufferOf(storageKey) {
  if (/^https?:/.test(storageKey)) {
    const r = await fetch(storageKey, { signal: AbortSignal.timeout(8000) })
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null
  }
  const rest = storageKey.replace(/^\/uploads\//, '')
  for (const dir of UPLOAD_DIRS) {
    try { return await readFile(join(dir, rest)) } catch { /* next folder */ }
  }
  return null
}

/** { sig, px } for an image, or null when it cannot be read. */
export async function imageSignature(storageKey) {
  if (cache.has(storageKey)) return cache.get(storageKey)
  let out = null
  try {
    const buf = await bufferOf(storageKey)
    if (buf) {
      const { width, height } = await sharp(buf).metadata()
      const flat = sharp(buf).flatten({ background: '#ffffff' }).grayscale()
      const trimmed = await flat.clone().trim({ threshold: 30 }).toBuffer().catch(() => flat.toBuffer())
      out = { sig: await sharp(trimmed).resize(24, 24, { fit: 'fill' }).raw().toBuffer(), px: width * height }
    }
  } catch { out = null }
  cache.set(storageKey, out)
  return out
}

function same(a, b) {
  if (!a || !b) return false
  let d = 0
  for (let i = 0; i < a.sig.length; i++) d += Math.abs(a.sig[i] - b.sig[i])
  return d / a.sig.length <= SAME
}

/** The first of `existing` ({ id, storageKey }) showing the same picture as `storageKey`. */
export async function findSameImage(storageKey, existing) {
  const mine = await imageSignature(storageKey)
  if (!mine) return null
  for (const e of existing) {
    const theirs = await imageSignature(e.storageKey)
    if (same(mine, theirs)) return { ...e, px: theirs.px, newPx: mine.px }
  }
  return null
}

/**
 * Drops near-duplicates from an ordered list of storage keys, keeping the
 * higher-resolution copy in the place of the first one listed.
 */
export async function dedupeImageKeys(keys) {
  const kept = []
  const dropped = []
  for (const key of keys) {
    const sig = await imageSignature(key)
    const at = kept.findIndex((k) => same(sig, k.sig))
    if (at === -1) { kept.push({ key, sig }); continue }
    if ((sig?.px ?? 0) > (kept[at].sig?.px ?? 0)) { dropped.push(kept[at].key); kept[at] = { key, sig } }
    else dropped.push(key)
  }
  return { keys: kept.map((k) => k.key), dropped }
}

/**
 * Adds an image to a product unless it already shows that picture. A sharper
 * copy replaces the old one in place (same position, role and description);
 * a copy no sharper than what is there is not added — and when `ownsFile`,
 * the just-saved upload is deleted again. Returns 'added' | 'replaced' | 'skipped'.
 */
export async function addImageOnce(productId, img, { ownsFile = false } = {}) {
  const { getDb } = await import('./db.server.js')
  const { productImages } = await import('../db/schema.js')
  const { eq } = await import('drizzle-orm')
  const { addImage } = await import('./admin-queries.server.js')
  const { deleteUpload } = await import('./uploads.server.js')
  const db = await getDb()
  const existing = await db.select({ id: productImages.id, storageKey: productImages.storageKey })
    .from(productImages).where(eq(productImages.productId, Number(productId)))
  const match = await findSameImage(img.storageKey, existing)
  if (!match) { await addImage(productId, img); return 'added' }
  if (match.newPx > match.px) {
    await db.update(productImages)
      .set({ storageKey: img.storageKey, width: img.width ?? null, height: img.height ?? null })
      .where(eq(productImages.id, match.id))
    return 'replaced'
  }
  if (ownsFile) await deleteUpload(img.storageKey)
  return 'skipped'
}

/** "2 images added. 1 replaced a lower-resolution copy…" from addImageOnce results. */
export function describeImageResults(results) {
  const n = (k) => results.filter((r) => r === k).length
  const parts = []
  if (n('added')) parts.push(`${n('added')} image${n('added') === 1 ? '' : 's'} added.`)
  if (n('replaced')) parts.push(`${n('replaced')} replaced a lower-resolution copy of the same picture.`)
  if (n('skipped')) parts.push(`${n('skipped')} not added: the product already has ${n('skipped') === 1 ? 'that picture' : 'those pictures'} at the same or higher resolution.`)
  return parts.join(' ') || 'No images added.'
}

/** A Media library path ("/uploads/x.webp") as an image to attach, or null if it is not a library file. */
export async function mediaImage(path) {
  const { existsSync } = await import('node:fs')
  const { mediaFile } = await import('./uploads.server.js')
  const rest = String(path).match(/^\/uploads\/((?:panelling\/)?[^/]+)$/)?.[1]
  const file = rest && UPLOAD_DIRS.map((d) => join(d, rest)).find((x) => mediaFile(x) && existsSync(x))
  if (!file) return null
  const meta = await sharp(file).metadata().catch(() => ({}))
  return { storageKey: path, width: meta.width ?? null, height: meta.height ?? null }
}
