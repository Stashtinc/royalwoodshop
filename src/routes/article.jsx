import { Link, useLoaderData } from 'react-router'
import { getPost } from '../data/blog'
import { pageMeta, truncate, BASE, SITE } from '../seo'

export async function loader({ request, params }) {
  let post = getPost(params.slug)
  if (!post) {
    // A signed-in admin can preview a draft, which is not on the public site yet.
    const { getUser } = await import('../lib/auth.server.js')
    if (await getUser(request)) {
      const { getPostBySlug } = await import('../lib/posts.server.js')
      post = await getPostBySlug(params.slug)
    }
  }
  if (!post) throw new Response('Not found', { status: 404 })
  return { post, preview: Boolean(post.status && post.status !== 'published') }
}

export const meta = ({ data }) => {
  if (!data) return pageMeta({ title: 'Not found', description: '', path: '/' })
  const p = data.post
  const path = `/${p.slug}`
  const description = p.seoDescription || truncate(p.excerpt ?? '', 155)

  return pageMeta({
    title: p.seoTitle || p.title,
    description,
    path,
    image: p.featuredImage || undefined,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title,
      description,
      image: p.featuredImage || undefined,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt ?? p.publishedAt,
      articleSection: p.categories?.[0],
      author: { '@type': 'Organization', name: SITE },
      publisher: { '@type': 'Organization', name: SITE },
      mainEntityOfPage: `${BASE}${path}`,
    },
  })
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Article() {
  const { post, preview } = useLoaderData()
  return (
    <article className="py-12 lg:py-16">
      <div className="mx-auto max-w-[760px] px-6">
        {preview && (
          <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-sans text-sm text-amber-900">
            Draft preview. This article is not published, and only signed-in admins can see it.
          </p>
        )}
        <nav className="flex items-center gap-2 font-sans text-sm text-gray-500">
          <Link to="/blog" className="hover:text-royal-blue">Blog</Link>
          {post.categories[0] && <><span>›</span><span>{post.categories[0]}</span></>}
        </nav>

        <h1 className="mt-4 font-serif text-3xl leading-tight font-bold text-tundora lg:text-4xl">
          {post.title}
        </h1>
        {post.publishedAt && (
          <p className="mt-3 font-sans text-sm text-gray-500">
            {dateFormat.format(new Date(post.publishedAt))}
          </p>
        )}

        {post.featuredImage && (
          <img src={post.featuredImage} alt={post.featuredImageAlt ?? ''}
            className="mt-8 w-full rounded-2xl object-cover" />
        )}

        {/* Content comes from the WordPress export and from the admin editor,
            both of which produce HTML. */}
        <div
          className="prose-royal mt-8"
          dangerouslySetInnerHTML={{ __html: post.contentHtml ?? '' }}
        />

        <div className="mt-12 border-t border-gray-200 pt-8">
          <Link to="/blog" className="font-sans text-sm font-medium text-royal-blue hover:underline">
            ← Back to the blog
          </Link>
        </div>
      </div>
    </article>
  )
}
