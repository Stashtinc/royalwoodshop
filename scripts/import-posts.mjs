/**
 * Loads the blog articles exported from the WordPress database.
 *
 *   npm run import:posts
 *
 * Matched on slug and updated in place, so it is safe to re-run.
 */
import { eq, sql } from 'drizzle-orm'
import { connect } from '../src/db/client.mjs'
import { posts, postCategories, postsToCategories } from '../src/db/schema.js'
import { readCsv, slugify, nonEmpty } from './_lib.mjs'

export async function run(db, file = 'data/posts.csv') {
  const rows = readCsv(file)
  console.log(`read ${rows.length} articles`)

  const catIds = new Map()
  for (const r of rows) {
    for (const name of String(r.categories ?? '').split('|').map((s) => s.trim()).filter(Boolean)) {
      if (catIds.has(name)) continue
      const [c] = await db.insert(postCategories)
        .values({ slug: slugify(name), name })
        .onConflictDoUpdate({ target: postCategories.slug, set: { name } })
        .returning({ id: postCategories.id })
      catIds.set(name, c.id)
    }
  }

  for (const r of rows) {
    const values = {
      legacyId: Number(r.legacy_id) || null,
      slug: r.slug.trim(),
      title: r.title,
      excerpt: nonEmpty(r.excerpt),
      contentHtml: r.content_html,
      featuredImage: nonEmpty(r.featured_image),
      status: 'published',
      seoTitle: nonEmpty(r.seo_title),
      seoDescription: nonEmpty(r.seo_description),
      publishedAt: r.published_at ? new Date(r.published_at.replace(' ', 'T') + 'Z') : null,
    }
    const [p] = await db.insert(posts).values(values)
      .onConflictDoUpdate({ target: posts.slug, set: { ...values, updatedAt: new Date() } })
      .returning({ id: posts.id })

    await db.delete(postsToCategories).where(eq(postsToCategories.postId, p.id))
    for (const name of String(r.categories ?? '').split('|').map((s) => s.trim()).filter(Boolean)) {
      await db.insert(postsToCategories)
        .values({ postId: p.id, categoryId: catIds.get(name) }).onConflictDoNothing()
    }
  }

  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(posts)
  console.log(`${count} articles in the database, ${catIds.size} categories`)
  return count
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, close } = connect()
  await run(db); await close(); process.exit(0)
}
