/**
 * Imports cropped profile-drawing JPGs (generated from test_images PDFs) into
 * the product_images table, replacing any existing profile_drawing for each product.
 *
 *   node scripts/import-profile-drawings.mjs
 */
import 'dotenv/config'
import { connect } from '../src/db/client.mjs'
import { products, productImages } from '../src/db/schema.js'
import { eq, and } from 'drizzle-orm'

const { db, close } = connect()

const DRAWINGS = [
  { code: 'BAC-102',  slug: 'backband-moulding-bac102',                              file: 'profile-drawing-bac-102.jpg',   w: 640, h: 715 },
  { code: 'BAC-121',  slug: 'backband-moulding-colonial-bac121',                     file: 'profile-drawing-bac-121.jpg',   w: 640, h: 715 },
  { code: 'BAC-154',  slug: 'backband-moulding-modern-transitional-bac154',          file: 'profile-drawing-bac-154.jpg',   w: 640, h: 695 },
  { code: 'BAC-174',  slug: 'backband-moulding-large-traditional-heritage-bac-174',  file: 'profile-drawing-bac-174.jpg',   w: 640, h: 722 },
  { code: 'BAC-1D2',  slug: 'backband-moulding-bac1d2',                              file: 'profile-drawing-bac-1d2.jpg',   w: 640, h: 722 },
  { code: 'BAC-1L0',  slug: 'large-modern-transitional-backband-moulding-bac1l0',    file: 'profile-drawing-bac-1l0.jpg',   w: 640, h: 722 },
  { code: 'BAC-4697', slug: 'backband-moulding-builder-casing-bac4697',              file: 'profile-drawing-bac-4697.jpg',  w: 640, h: 703 },
  { code: 'BAR-301',  slug: 'bar-railing-bar301',                                    file: 'profile-drawing-bar-301.jpg',   w: 640, h: 715 },
  { code: 'BAS-5AR',  slug: 'baseboard-plain-5-inch-bas5ar',                         file: 'profile-drawing-bas-5ar.jpg',   w: 640, h: 716 },
  { code: 'BAS-5C9',  slug: 'baseboard-regal-5-inch-bas5c9',                         file: 'profile-drawing-bas-5c9.jpg',   w: 640, h: 715 },
  { code: 'BAS-5E9',  slug: 'baseboard-ornamental-5-inch-bas5e9',                    file: 'profile-drawing-bas-5e9.jpg',   w: 640, h: 715 },
  { code: 'BAS-5M7',  slug: 'baseboard-modern-transitional-5-inch-bas5m7',           file: 'profile-drawing-bas-5m7.jpg',   w: 640, h: 722 },
]

let ok = 0, skipped = 0

for (const { code, slug, file, w, h } of DRAWINGS) {
  // Find the product DB row
  const [product] = await db.select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) {
    console.log(`SKIP ${code} — product not found in DB (slug: ${slug})`)
    skipped++
    continue
  }

  const storageKey = `/uploads/${file}`

  // Delete any existing profile_drawing images for this product
  await db.delete(productImages)
    .where(and(
      eq(productImages.productId, product.id),
      eq(productImages.role, 'profile_drawing')
    ))

  // Insert new profile drawing
  await db.insert(productImages).values({
    productId: product.id,
    storageKey,
    altText:   product.name,
    width:     w,
    height:    h,
    role:      'profile_drawing',
    sortOrder: 0,
  })

  console.log(`OK  ${code} → ${storageKey}`)
  ok++
}

await close()
console.log(`\nDone: ${ok} updated, ${skipped} skipped`)
process.exit(0)
