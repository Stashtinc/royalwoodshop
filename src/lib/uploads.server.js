import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join, extname, resolve, relative } from 'node:path'
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
/** Where new uploads are written. On Railway this is the persistent volume;
 *  locally it is public/uploads. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'

/** Every folder served at /uploads, newest first. On Railway there are two:
 *  the volume (UPLOAD_DIR) for anything uploaded through the admin, and the
 *  3,700+ migrated images committed to git in public/uploads, which ship with
 *  each deploy. Anything that lists or looks up images must read both, or it
 *  sees only half the library. Locally they are the same folder. */
export const UPLOAD_DIRS = [...new Set([UPLOAD_DIR, 'public/uploads'])]

const PUBLIC_PREFIX = '/uploads'

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  // Not SVG: an SVG can carry a script, and uploads are served from the site's
  // own domain, so one opened directly would run as royalwoodshop.com.
}
const MAX_BYTES = 12 * 1024 * 1024   // staff will upload phone photos

export function describeLimits() {
  return { types: Object.keys(ALLOWED), maxMb: MAX_BYTES / 1024 / 1024 }
}

/**
 * Saves an upload and generates the responsive set.
 *
 * Everything is converted to WebP — typically 25–35% smaller than JPEG at the
 * same quality — and written at each width up to the original. Nothing is ever
 * upscaled.
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
  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image'
  const stem = `${safeSlug}-${randomBytes(5).toString('hex')}`
  const buffer = Buffer.from(await file.arrayBuffer())
  return writeImage(buffer, stem, file.name)
}

/**
 * Converts and writes one image, plus a file per responsive width.
 *
 * Shared by uploads and by AI-generated images, deliberately: once a generated
 * image is chosen it should be indistinguishable from an uploaded one to every
 * other part of the system.
 */
async function writeImage(buffer, stem, label = 'image') {
  let image
  try {
    image = sharp(buffer, { failOn: 'error' }).rotate()   // honours EXIF orientation
  } catch {
    return { error: `${label} could not be read as an image.` }
  }

  const meta = await image.metadata()
  if (!meta.width || !meta.height) return { error: `${label} has no readable dimensions.` }

  const storageKey = `${PUBLIC_PREFIX}/${stem}.webp`

  // Full-size. Higher quality (92) keeps line-art drawings sharp — lossy WebP
  // at 80–82 blurs thin lines noticeably even though it looks fine on photos.
  await writeFile(
    join(UPLOAD_DIR, `${stem}.webp`),
    await image.clone().webp({ quality: 92 }).toBuffer(),
  )

  // One file per width, never larger than the original.
  for (const w of WIDTHS) {
    if (w > meta.width) continue
    const key = variantPath(storageKey, w)
    await writeFile(
      join(UPLOAD_DIR, key.slice(PUBLIC_PREFIX.length + 1)),
      await image.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 90 }).toBuffer(),
    )
  }

  return { storageKey, width: meta.width, height: meta.height }
}

/** Stores an image we produced ourselves rather than received as an upload. */
export async function saveImageBuffer(buffer, { slug = 'image' } = {}) {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image'
  const stem = `${safeSlug}-${randomBytes(5).toString('hex')}`
  return writeImage(buffer, stem)
}

/* ------------------------------------------------------- Media library -- */

/** What the Media library lists, uploads and renames. */
const MEDIA_EXT = /\.(webp|jpe?g|png)$/i
const MEDIA_FORMATS = new Set(['webp', 'jpeg', 'png'])
const MEDIA_MAX_BYTES = 10 * 1024 * 1024

/**
 * The file a path sent back by the browser points at, or null unless it is an
 * image directly in an upload folder or its panelling/ subfolder — all the
 * library ever lists. The path is resolved before it is compared, so one that
 * starts in an upload folder and climbs out (public/uploads/../../.env) is
 * refused.
 *
 * Returns { dir, sub, name }: the upload folder, '' or '/panelling', the name.
 */
export function mediaFile(path) {
  if (typeof path !== 'string') return null
  for (const dir of UPLOAD_DIRS) {
    const m = relative(resolve(dir), resolve(path)).match(/^(?:(panelling)\/)?([^/]+)$/)
    if (m && MEDIA_EXT.test(m[2])) return { dir, sub: m[1] ? '/panelling' : '', name: m[2] }
  }
  return null
}

/** The name an upload is saved under: the last segment of what the browser
 *  sent, reduced to the characters a rename allows. Null unless it is named as
 *  a WebP, JPEG or PNG. */
export function mediaUploadName(name) {
  const base = String(name ?? '').split(/[/\\]/).pop()
  const ext = base.match(MEDIA_EXT)?.[0]
  if (!ext) return null
  const stem = base.slice(0, -ext.length).replace(/[^\w\-.]+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return stem ? `${stem}${ext}` : null
}

/**
 * Saves a file uploaded through the Media library under its own name.
 *
 * Unlike saveUpload the name is kept, because the Master Product List refers
 * to images by file name. But the name and the bytes both come from the
 * browser, so the name loses any folder part and the file must really be a
 * WebP, JPEG or PNG — a script called photo.png is refused.
 *
 * Returns { name } or { error }.
 */
export async function saveMediaUpload(file) {
  if (!file || typeof file === 'string' || file.size === 0) return { error: 'No file received.' }
  const name = mediaUploadName(file.name)
  if (!name) return { error: `${file.name}: only WebP, JPG and PNG images can be uploaded here.` }
  if (file.size > MEDIA_MAX_BYTES) return { error: `${file.name} exceeds 10 MB limit.` }

  const buffer = Buffer.from(await file.arrayBuffer())
  const format = await sharp(buffer).metadata().then((m) => m.format, () => null)
  if (!MEDIA_FORMATS.has(format)) return { error: `${file.name} is not a readable WebP, JPG or PNG image.` }

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, name), buffer)
  return { name }
}

/** Only removes files this app wrote — never anything carried over from the
 *  old site, which are absolute URLs pointing at royalwoodshop.com. */
export async function deleteUpload(storageKey) {
  if (!storageKey?.startsWith(`${PUBLIC_PREFIX}/`)) return
  // Library files are shared: never delete one another product or a blog post still shows.
  const { getDb } = await import('./db.server.js')
  const { productImages, posts } = await import('../db/schema.js')
  const { eq } = await import('drizzle-orm')
  const db = await getDb()
  const [inProduct] = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.storageKey, storageKey)).limit(1)
  const [inPost] = await db.select({ id: posts.id }).from(posts).where(eq(posts.featuredImage, storageKey)).limit(1)
  if (inProduct || inPost) return
  const paths = [storageKey, ...WIDTHS.map((w) => variantPath(storageKey, w))]
  for (const p of paths) {
    try { await unlink(join(UPLOAD_DIR, p.slice(PUBLIC_PREFIX.length + 1))) }
    catch { /* already gone */ }
  }
}
