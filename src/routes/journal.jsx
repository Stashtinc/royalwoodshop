import { Link, useLoaderData } from 'react-router'
import { listPosts } from '../lib/posts.server'
import { pageMeta, truncate } from '../seo'

export async function loader() {
  const { rows } = await listPosts({ perPage: 100 })
  return { posts: rows }
}

export const meta = () => pageMeta({
  title: 'The Royal Wood Shop Journal',
  description: 'Stories, trends, product highlights and practical guidance on trim, mouldings, interior doors and millwork from The Royal Wood Shop.',
  path: '/blog',
})

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Journal() {
  const { posts } = useLoaderData()
  return (
    <section className="py-12 lg:py-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-tundora lg:text-4xl">The Royal Wood Shop Journal</h1>
        <p className="mt-2 max-w-2xl font-sans text-gray-600">
          Stories, trends, product highlights and helpful resources to support your next project.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <article key={p.id} className="flex flex-col">
              <Link to={`/${p.slug}`} className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg">
                {p.featuredImage && (
                  <div className="aspect-[3/2] overflow-hidden bg-gray-100">
                    <img src={p.featuredImage} alt="" loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {p.categories.length > 0 && (
                    <p className="font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
                      {p.categories[0]}
                    </p>
                  )}
                  <h2 className="font-serif text-lg leading-snug font-bold text-tundora">{p.title}</h2>
                  {p.excerpt && <p className="font-sans text-sm text-gray-600">{truncate(p.excerpt, 130)}</p>}
                  {p.publishedAt && (
                    <p className="mt-auto pt-2 font-sans text-xs text-gray-400">
                      {dateFormat.format(new Date(p.publishedAt))}
                    </p>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
