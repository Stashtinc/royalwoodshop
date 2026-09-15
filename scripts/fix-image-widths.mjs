/**
 * Generates missing responsive variants for product images that have width=null.
 *
 * Images uploaded before the responsive pipeline was in place (or uploaded via
 * older tools) have the base file on disk but no -320/-640/-960/-1440 variants,
 * and no recorded width in the DB. This script:
 *
 *   1. Finds all product_images rows with width IS NULL
 *   2. Reads the file, measures it with sharp, generates the missing variants
 *   3. Updates width (and height) in the DB so thumbSrc and srcSet work
 *
 *   railway run node scripts/fix-image-widths.mjs
 */
import 'dotenv/config'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { eq, isNull } from 'drizzle-orm'
import sharp from 'sharp'
import { getDb } from '../src/lib/db.server.js'
import { productImages } from '../src/db/schema.js'
import { WIDTHS, variantPath } from '../src/lib/images.js'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'

const db = await getDb()
const rows = await db.select({
  id: productImages.id,
  key: productImages.storageKey,
}).from(productImages).where(isNull(productImages.width))

console.log(`Found ${rows.length} images with no recorded width.`)

let fixed = 0, skipped = 0, errored = 0

for (const row of rows) {
  const rel = row.key.replace(/^\/uploads\//, '')
  const filePath = join(UPLOAD_DIR, rel)

  if (!existsSync(filePath)) {
    console.log(`  SKIP (file missing): ${row.key}`)
    skipped++
    continue
  }

  try {
    const buf = await readFile(filePath)
    const image = sharp(buf).rotate()
    const meta = await image.metadata()
    if (!meta.width || !meta.height) { skipped++; continue }

    // Generate missing width variants
    for (const w of WIDTHS) {
      if (w > meta.width) continue
      const variantKey = variantPath(row.key, w)
      const variantFile = join(UPLOAD_DIR, variantKey.replace(/^\/uploads\//, ''))
      if (existsSync(variantFile)) continue   // already there
      const out = await image.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
      await writeFile(variantFile, out)
    }

    await db.update(productImages)
      .set({ width: meta.width, height: meta.height })
      .where(eq(productImages.id, row.id))

    console.log(`  OK  ${row.key}  (${meta.width}×${meta.height})`)
    fixed++
  } catch (e) {
    console.error(`  ERR ${row.key}: ${e.message}`)
    errored++
  }
}

console.log(`\nDone. Fixed: ${fixed}  Skipped: ${skipped}  Errors: ${errored}`)
process.exit(0)
