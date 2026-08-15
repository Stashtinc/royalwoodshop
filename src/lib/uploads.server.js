import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { WIDTHS, variantPath } from './images.js'

/**
 * Uploaded images are written to public/uploads.
 *
 * Vite copies public/ into the build output, so anything uploaded here ships
 * with the static site — no image host, no CDN account, no third party.
 *
 * On a server, this directory must survive deploys and be included in whatever
 * copies the built site to the public host.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'
const PUBLIC_PREFIX = '/uploads'

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
}
const MAX_BYTES = 12 * 1024 * 1024   // staff will upload phone photos

export function describeLimits() {
  return { types: Object.keys(ALLOWED), maxMb: MAX_BYTES / 1024 / 1024 }
}

/**
 * Saves an upload and generates the responsive set.
 *
 * Everything raster is converted to WebP — typically 25–35% smaller than JPEG
 * at the same quality — and written at each width up to the original. Nothing
 * is ever upscaled. SVGs are stored as-is; they are already resolution
 * independent and re-encoding them would only make them worse.
 *
 * Returns { storageKey, width, height } or { error }.
 */
export async function saveUpload(file, { slug = 'product' } = {}) {
  if (!file || typeof file === 'string' || file.size === 0) return { error: 'No file received.' }
  if (!ALLOWED[file.type]) {
    return { error: `${file.name}: ${file.type || 'unknown type'} is not an image we accept.` }
  }
  if (file.size > MAX_BYTES) {
    return { error: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_BYTES / 1024 / 1024} MB.` }
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60)
  const stem = `${safeSlug}-${randomBytes(5).toString('hex')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // SVG: store untouched.
  if (file.type === 'image/svg+xml') {
    await writeFile(join(UPLOAD_DIR, `${stem}.svg`), buffer)
    return { storageKey: `${PUBLIC_PREFIX}/${stem}.svg`, width: null, height: null }
  }

  let image
  try {
    image = sharp(buffer, { failOn: 'error' }).rotate()   // honours EXIF orientation
  } catch {
    return { error: `${file.name} could not be read as an image.` }
  }

  const meta = await image.metadata()
  if (!meta.width || !meta.height) return { error: `${file.name} has no readable dimensions.` }

  const storageKey = `${PUBLIC_PREFIX}/${stem}.webp`

  // Full-size, compressed.
  await writeFile(
    join(UPLOAD_DIR, `${stem}.webp`),
    await image.clone().webp({ quality: 82 }).toBuffer(),
  )

  // One file per width, never larger than the original.
  for (const w of WIDTHS) {
    if (w > meta.width) continue
    const key = variantPath(storageKey, w)
    await writeFile(
      join(UPLOAD_DIR, key.slice(PUBLIC_PREFIX.length + 1)),
      await image.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    )
  }

  return { storageKey, width: meta.width, height: meta.height }
}

/** Only removes files this app wrote — never anything carried over from the
 *  old site, which are absolute URLs pointing at royalwoodshop.com. */
export async function deleteUpload(storageKey) {
  if (!storageKey?.startsWith(`${PUBLIC_PREFIX}/`)) return
  const paths = [storageKey, ...WIDTHS.map((w) => variantPath(storageKey, w))]
  for (const p of paths) {
    try { await unlink(join(UPLOAD_DIR, p.slice(PUBLIC_PREFIX.length + 1))) }
    catch { /* already gone */ }
  }
}
