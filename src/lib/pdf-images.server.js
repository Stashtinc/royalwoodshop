import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const UPLOAD_DIRS = [process.env.UPLOAD_DIR, 'public/uploads'].filter(Boolean)

/**
 * Product images are WebP, which PDFs cannot embed, so each one is converted
 * to PNG (profile drawings rely on transparency). Uploads are read straight
 * from disk, from the same places server.mjs serves /uploads from.
 */
export async function loadImage(url) {
  if (!url) return null
  try {
    let buf = null
    if (url.startsWith('/uploads/')) {
      const name = url.slice('/uploads/'.length)
      for (const dir of UPLOAD_DIRS) {
        buf = await readFile(resolve(dir, name)).catch(() => null)
        if (buf) break
      }
    } else if (/^https?:\/\//.test(url)) {
      const res = await fetch(url)
      if (res.ok) buf = Buffer.from(await res.arrayBuffer())
    }
    if (!buf) return null
    return await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).flatten({ background: '#ffffff' }).png().toBuffer()
  } catch {
    // A missing or unreadable picture should not cost the customer the sheet.
    return null
  }
}
