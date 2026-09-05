/**
 * Scrapes product images from the old WordPress/UPCP site and inserts any
 * additional images (beyond the first) into product_images.
 *
 *   node scripts/scrape-images.mjs
 */
import 'dotenv/config'
import { connect } from '../src/db/client.mjs'
import { products, productImages } from '../src/db/schema.js'
import { eq, inArray } from 'drizzle-orm'

const API = 'https://royalwoodshop.com/wp-json/wp/v2/upcp_product'
const PER_PAGE = 20

async function fetchPage(page, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${API}?per_page=${PER_PAGE}&page=${page}`)
      if (res.status === 400) return null  // no more pages
      if (!res.ok) {
        if (i < retries - 1) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); continue }
        return null  // skip this page
      }
      return res.json()
    } catch (e) {
      if (i < retries - 1) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); continue }
      return null
    }
  }
  return null
}

function extractImages(content) {
  // Pull full-res URLs from UPCP lightbox data-ulbsource attributes
  const matches = [...content.matchAll(/data-ulbsource=['"]([^'"]+)['"]/g)]
  const urls = [...new Set(matches.map(m => m[1]).filter(u => u.startsWith('http')))]
  return urls
}

async function main() {
  const { db } = connect()

  // Load all existing product_images keyed by product_id → Set of storage_keys
  const existing = await db.select({
    productId: productImages.productId,
    storageKey: productImages.storageKey,
  }).from(productImages)

  const existingByProduct = new Map()
  for (const row of existing) {
    if (!existingByProduct.has(row.productId)) existingByProduct.set(row.productId, new Set())
    existingByProduct.get(row.productId).add(row.storageKey)
  }

  // Load all products keyed by slug for matching
  const allProducts = await db.select({
    id: products.id,
    slug: products.slug,
    productCode: products.productCode,
    name: products.name,
  }).from(products)

  const bySlug = new Map(allProducts.map(p => [p.slug, p]))
  const byCode = new Map(allProducts.filter(p => p.productCode).map(p => [p.productCode.toLowerCase(), p]))

  let page = 1
  let totalAdded = 0
  let totalSkipped = 0
  let totalUnmatched = 0

  while (true) {
    process.stdout.write(`Fetching page ${page}…`)
    const items = await fetchPage(page)
    if (items === null) { console.log(' skipped (error or end)'); page++; if (page > 80) break; continue }
    if (!items.length) { console.log(' done'); break }
    console.log(` ${items.length} products`)

    for (const item of items) {
      const wpSlug = item.slug ?? ''
      const title = item.title?.rendered ?? ''
      const content = item.content?.rendered ?? ''

      // Try to match by slug first, then by product code extracted from title/slug
      let product = bySlug.get(wpSlug)
      if (!product) {
        // Extract product code from slug (e.g. "bas-7t2" → "BAS-7T2")
        const codeFromSlug = wpSlug.replace(/-/g, '').toUpperCase()
        product = byCode.get(wpSlug.toLowerCase()) ||
          [...byCode.entries()].find(([k]) => k.replace(/-/g,'') === wpSlug.replace(/-/g,'').toLowerCase())?.[1]
      }

      if (!product) {
        totalUnmatched++
        continue
      }

      const images = extractImages(content)
      const uniqueImages = [...new Set(images)]

      const existingKeys = existingByProduct.get(product.id) ?? new Set()
      const currentSortOrders = [...existingKeys].length

      let sortOrder = currentSortOrders
      for (const url of uniqueImages) {
        if (existingKeys.has(url)) { totalSkipped++; continue }

        const inserted = await db.insert(productImages).values({
          productId: product.id,
          storageKey: url,
          altText: title || 'Product image',
          role: url.toLowerCase().includes('install') ? 'installed_photo'
              : url.toLowerCase().includes('3d') || url.toLowerCase().includes('profile') ? 'profile_drawing'
              : 'product_photo',
          sortOrder: sortOrder++,
        }).returning({ id: productImages.id })

        if (inserted.length) {
          existingKeys.add(url)
          totalAdded++
        } else {
          console.warn(`  Insert returned nothing for ${url}`)
        }
      }
    }

    page++
    // Small delay to be polite to the server
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\nDone.`)
  console.log(`  Added:     ${totalAdded} images`)
  console.log(`  Skipped:   ${totalSkipped} already present`)
  console.log(`  Unmatched: ${totalUnmatched} WP products with no DB match`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
