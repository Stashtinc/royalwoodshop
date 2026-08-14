/**
 * Loads data/products.csv (the Phase 0 audit export) into Postgres.
 * Matches on slug and updates in place, so it is safe to re-run.
 *
 *   npm run import:products
 */
import { eq, sql } from 'drizzle-orm'
import { connect } from '../src/db/client.mjs'
import { categories, products, productCategories, productImages } from '../src/db/schema.js'
import { readCsv, slugify, num, nonEmpty } from './_lib.mjs'

const CATEGORY_NAMES = {
  'trim-mouldings': 'Trim and Mouldings',
  'interior-doors': 'Interior Doors',
  'door-hardware': 'Door Hardware',
  'stair-railing': 'Stairs & Railings',
  UNASSIGNED: 'Uncategorised',
}

export async function run(db, file = 'data/products.csv') {
  const rows = readCsv(file)
  console.log(`read ${rows.length} products`)

  // Duplicate slugs would silently collapse two products into one.
  const bySlug = new Map()
  for (const r of rows) {
    const key = slugify(r.slug)
    bySlug.set(key, [...(bySlug.get(key) ?? []), r.product_code || r.name])
  }
  const dupes = [...bySlug.entries()].filter(([, v]) => v.length > 1)
  if (dupes.length) {
    console.warn(`\nWARNING: ${dupes.length} duplicate slug(s) — only the last row of each survives:`)
    for (const [slug, codes] of dupes) console.warn(`  ${slug} <- ${codes.join(', ')}`)
    console.warn('')
  }

  const catIds = new Map()
  for (const slug of new Set(rows.map((r) => r.category_slug))) {
    const name = CATEGORY_NAMES[slug] ?? slug
    const [row] = await db.insert(categories).values({ slug, name })
      .onConflictDoUpdate({ target: categories.slug, set: { name, updatedAt: new Date() } })
      .returning({ id: categories.id })
    catIds.set(slug, row.id)
  }

  const subIds = new Map()
  for (const r of rows) {
    const sub = nonEmpty(r.subcategory)
    if (!sub) continue
    const key = `${r.category_slug}/${sub}`
    if (subIds.has(key)) continue
    const slug = `${r.category_slug}-${slugify(sub)}`
    const [row] = await db.insert(categories)
      .values({ slug, name: sub, parentId: catIds.get(r.category_slug) ?? null })
      .onConflictDoUpdate({ target: categories.slug, set: { name: sub, updatedAt: new Date() } })
      .returning({ id: categories.id })
    subIds.set(key, row.id)
  }
  console.log(`categories: ${catIds.size} top level, ${subIds.size} sub-categories`)

  for (const r of rows) {
    const status = ['published', 'archived', 'draft'].includes(r.status) ? r.status : 'draft'
    const slug = slugify(r.slug)
    const values = {
      legacyItemId: Number(r.legacy_item_id) || null,
      slug,
      productCode: nonEmpty(r.product_code),
      name: r.name || slug,
      description: nonEmpty(r.description),
      primaryCategoryId: catIds.get(r.category_slug) ?? null,
      thicknessIn: num(r.thickness_in),
      widthIn: num(r.width_in),
      sizeDisplay: nonEmpty(r.size_display),
      price: num(r.price),
      seoTitle: nonEmpty(r.seo_title),
      seoDescription: nonEmpty(r.seo_description),
      legacyViews: Number(r.legacy_views) || 0,
      status,
    }
    const [p] = await db.insert(products)
      .values({ ...values, publishedAt: status === 'published' ? new Date() : null })
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: new Date() } })
      .returning({ id: products.id })

    const links = [catIds.get(r.category_slug)]
    const sub = nonEmpty(r.subcategory)
    if (sub) links.push(subIds.get(`${r.category_slug}/${sub}`))
    for (const cid of links) {
      if (cid) await db.insert(productCategories).values({ productId: p.id, categoryId: cid }).onConflictDoNothing()
    }

    const img = nonEmpty(r.image_url)
    if (img) {
      const existing = await db.select({ id: productImages.id }).from(productImages)
        .where(eq(productImages.productId, p.id)).limit(1)
      if (!existing.length) {
        await db.insert(productImages).values({
          productId: p.id, storageKey: img, altText: r.name || slug,
          role: 'profile_drawing', sortOrder: 0,
        })
      }
    }
  }

  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(products)
  console.log(`${count} products in the database`)
  return count
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close()
}
