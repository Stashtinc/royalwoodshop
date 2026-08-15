import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomBytes } from 'node:crypto'

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

/** Returns { storageKey } or { error }. */
export async function saveUpload(file, { slug = 'product' } = {}) {
  if (!file || typeof file === 'string' || file.size === 0) return { error: 'No file received.' }
  if (!ALLOWED[file.type]) {
    return { error: `${file.name}: ${file.type || 'unknown type'} is not an image we accept.` }
  }
  if (file.size > MAX_BYTES) {
    return { error: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_BYTES / 1024 / 1024} MB.` }
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = ALLOWED[file.type] || extname(file.name) || '.bin'
  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60)
  const name = `${safeSlug}-${randomBytes(5).toString('hex')}${ext}`

  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()))
  return { storageKey: `${PUBLIC_PREFIX}/${name}` }
}

/** Only removes files this app wrote — never anything carried over from the
 *  old site, which are absolute URLs pointing at royalwoodshop.com. */
export async function deleteUpload(storageKey) {
  if (!storageKey?.startsWith(`${PUBLIC_PREFIX}/`)) return
  try { await unlink(join(UPLOAD_DIR, storageKey.slice(PUBLIC_PREFIX.length + 1))) }
  catch { /* already gone */ }
}
