import snapshot from './posts.json'

/**
 * The blog, as a committed snapshot.
 *
 * The database is the source of truth; `npm run sync:data` writes this file
 * from it. The public site reads only the snapshot, so it builds anywhere —
 * a hosting provider, CI, a laptop with no database — exactly like the
 * catalogue does.
 */
export const posts = snapshot

export const publishedPosts = snapshot
  .filter((p) => p.status === 'published')
  .sort((a, b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')))

export const getPost = (slug) => publishedPosts.find((p) => p.slug === slug) ?? null

export const postSlugs = () => publishedPosts.map((p) => p.slug)
