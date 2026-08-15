import { and, desc, eq, sql, ilike, or } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { posts, postCategories, postsToCategories } from '../db/schema.js'

const categoriesSubquery = sql`coalesce(
  (select array_agg(pc.name order by pc.name)
   from posts_to_categories ptc
   join post_categories pc on pc.id = ptc.category_id
   where ptc.post_id = posts.id), '{}')`

const shape = (r) => ({
  ...r,
  categories: Array.isArray(r.categories) ? r.categories : [],
})

export async function listPosts({ status = 'published', q = '', page = 1, perPage = 25 } = {}) {
  const db = await getDb()
  const where = []
  if (status !== 'all') where.push(eq(posts.status, status))
  if (q.trim()) {
    where.push(or(ilike(posts.title, `%${q.trim()}%`), ilike(posts.slug, `%${q.trim()}%`)))
  }
  const clause = where.length ? and(...where) : undefined

  const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(posts).where(clause)
  const rows = await db.select({
    id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
    featuredImage: posts.featuredImage, status: posts.status,
    publishedAt: posts.publishedAt, updatedAt: posts.updatedAt,
    categories: categoriesSubquery.as('categories'),
  }).from(posts).where(clause)
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(perPage).offset((page - 1) * perPage)

  return { rows: rows.map(shape), total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export async function getPostBySlug(slug) {
  const db = await getDb()
  const [row] = await db.select({
    id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
    contentHtml: posts.contentHtml, featuredImage: posts.featuredImage,
    featuredImageAlt: posts.featuredImageAlt, status: posts.status,
    seoTitle: posts.seoTitle, seoDescription: posts.seoDescription,
    publishedAt: posts.publishedAt, updatedAt: posts.updatedAt,
    categories: categoriesSubquery.as('categories'),
  }).from(posts).where(eq(posts.slug, slug)).limit(1)
  return row ? shape(row) : null
}

export async function getPostById(id) {
  const db = await getDb()
  const [row] = await db.select({
    id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
    contentHtml: posts.contentHtml, featuredImage: posts.featuredImage,
    featuredImageAlt: posts.featuredImageAlt, status: posts.status,
    seoTitle: posts.seoTitle, seoDescription: posts.seoDescription,
    publishedAt: posts.publishedAt,
    categories: categoriesSubquery.as('categories'),
  }).from(posts).where(eq(posts.id, Number(id))).limit(1)
  return row ? shape(row) : null
}

/**
 * Every article with its full content, for the snapshot the public site
 * builds from. The list query deliberately omits the body — it is large and
 * unused on a listing — so the snapshot needs its own query.
 */
export async function allPostsForSnapshot() {
  const db = await getDb()
  const rows = await db.select({
    id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
    contentHtml: posts.contentHtml, featuredImage: posts.featuredImage,
    featuredImageAlt: posts.featuredImageAlt, status: posts.status,
    seoTitle: posts.seoTitle, seoDescription: posts.seoDescription,
    publishedAt: posts.publishedAt, updatedAt: posts.updatedAt,
    categories: categoriesSubquery.as('categories'),
  }).from(posts).orderBy(desc(posts.publishedAt), desc(posts.id))
  return rows.map(shape)
}

export async function listCategories() {
  const db = await getDb()
  return db.select({
    id: postCategories.id, slug: postCategories.slug, name: postCategories.name,
    n: sql`(select count(*)::int from posts_to_categories ptc where ptc.category_id = ${postCategories.id})`,
  }).from(postCategories).orderBy(postCategories.name)
}

export async function savePost(id, data, categoryNames = []) {
  const db = await getDb()
  const values = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt || null,
    contentHtml: data.contentHtml || null,
    featuredImage: data.featuredImage || null,
    featuredImageAlt: data.featuredImageAlt || null,
    status: data.status,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    updatedAt: new Date(),
  }

  const postId = id
    ? (await db.update(posts).set(values).where(eq(posts.id, Number(id))).returning({ id: posts.id }))[0].id
    : (await db.insert(posts).values({ ...values, createdAt: new Date() }).returning({ id: posts.id }))[0].id

  await db.delete(postsToCategories).where(eq(postsToCategories.postId, postId))
  for (const name of categoryNames) {
    const [c] = await db.select({ id: postCategories.id }).from(postCategories)
      .where(eq(postCategories.name, name)).limit(1)
    if (c) await db.insert(postsToCategories).values({ postId, categoryId: c.id }).onConflictDoNothing()
  }
  return postId
}

/** Slug uniqueness, ignoring the post being edited. */
export async function slugTaken(slug, exceptId = null) {
  const db = await getDb()
  const rows = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1)
  return rows.length > 0 && String(rows[0].id) !== String(exceptId)
}
