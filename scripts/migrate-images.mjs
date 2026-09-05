/**
 * Downloads every WordPress-hosted image from product_images and re-saves it
 * locally via the same pipeline as manual uploads (WebP conversion + responsive
 * variants). Updates the storage_key in the DB so the site no longer depends
 * on royalwoodshop.com being live.
 *
 *   node scripts/migrate-images.mjs
 *
 * Safe to re-run — already-migrated images are skipped.
 */
import 'dotenv/config'
import { connect } from '../src/db/client.mjs'
import { productImages, activityLog } from '../src/db/schema.js'
import { eq, like, sql } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'
const PUBLIC_PREFIX = '/uploads'
const WIDTHS = [320, 640, 960, 1440]

function variantPath(storageKey, w) {
  return storageKey.replace(/(\.\w+)$/, `-${w}$1`)
}

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 RoyalWoodShop-Migrator/1.0' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

async function saveBuffer(buffer, slug) {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image'
  const stem = `${safeSlug}-${randomBytes(5).toString('hex')}`

  let image
  try { image = sharp(buffer, { failOn: 'error' }).rotate() }
  catch { throw new Error('sharp could not read the image') }

  const meta = await image.metadata()
  if (!meta.width) throw new Error('no readable dimensions')

  const storageKey = `${PUBLIC_PREFIX}/${stem}.webp`
  await writeFile(join(UPLOAD_DIR, `${stem}.webp`), await image.clone().webp({ quality: 82 }).toBuffer())

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

async function main() {
  const { db } = connect()

  // Only migrate WP-hosted images
  const rows = await db.select({
    id: productImages.id,
    storageKey: productImages.storageKey,
    altText: productImages.altText,
  }).from(productImages)
    .where(like(productImages.storageKey, 'https://www.royalwoodshop.com%'))

  console.log(`${rows.length} WordPress-hosted images to migrate`)

  let migrated = 0, failed = 0, skipped = 0

  for (const [i, row] of rows.entries()) {
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.storageKey.split('/').pop()} … `)

    try {
      const buffer = await downloadBuffer(row.storageKey)
      const slug = row.storageKey.split('/').pop().replace(/\.[^.]+$/, '')
      const { storageKey, width, height } = await saveBuffer(buffer, slug)

      await db.update(productImages).set({ storageKey, width, height }).where(eq(productImages.id, row.id))
      console.log(`✓ → ${storageKey}`)
      migrated++
    } catch (e) {
      console.log(`✗ ${e.message}`)
      failed++
    }

    // Polite delay every 10 images
    if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone.`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Failed:   ${failed}`)

  await db.insert(activityLog).values({
    action: 'image.added',
    level: 'milestone',
    entityLabel: 'Migrated WordPress images to local storage',
    details: JSON.stringify({ migrated, failed }),
  })
  console.log('  Logged to activity log.')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
