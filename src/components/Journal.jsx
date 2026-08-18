import { Link } from 'react-router'
import { publishedPosts } from '../data/blog'
import { truncate } from '../seo'

/**
 * The three most recent articles, from the same snapshot as /blog.
 *
 * These were hardcoded, with links pointing at royalwoodshop.com — so the new
 * site's homepage sent readers back to the old WordPress site, and the copy
 * went stale the moment anything was published.
 */
const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Journal() {
  return (
    <section className="w-full bg-parchment py-10 lg:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-14 px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            From the Blog
          </h2>
          <p className="font-sans text-lg text-gray-600">
            Stories, trends, product highlights, and helpful resources to support your next project.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
          {publishedPosts.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              to={`/${post.slug}`}
              className="group flex gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-lg md:flex-col md:gap-0 md:p-0"
            >
              <div className="aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-royal-blue/5 md:aspect-[4/3] md:w-full md:rounded-none">
                {post.featuredImage
                  ? <img
                      src={post.featuredImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                  : <div className="flex h-full w-full items-center justify-center">
                      <span className="font-serif text-2xl text-royal-blue/30">RWS</span>
                    </div>}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5 md:gap-3 md:p-6">
                <span className="font-sans text-[11px] font-medium tracking-wide text-gray-400 uppercase md:text-xs">
                  {post.publishedAt ? dateFormat.format(new Date(post.publishedAt)) : ''}
                </span>

                <h3 className="line-clamp-2 font-serif text-base leading-snug font-bold text-[#24140d] group-hover:text-royal-blue md:line-clamp-none md:text-xl">
                  {post.title}
                </h3>

                <p className="line-clamp-2 font-sans text-xs leading-relaxed text-gray-600 md:line-clamp-none md:text-sm">
                  {truncate(post.excerpt ?? '', 120)}
                </p>

                <span className="mt-auto flex items-center gap-1.5 pt-1 font-sans text-xs font-medium text-royal-blue md:gap-2 md:pt-2 md:text-sm">
                  Read more
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    className="h-3 w-3 shrink-0 transition-transform duration-300 group-hover:translate-x-1 md:h-3.5 md:w-3.5"
                  >
                    <path
                      d="M1 7h12M8 2l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <Link
          to="/blog"
          className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-4 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
        >
          View all {publishedPosts.length} articles
        </Link>
      </div>
    </section>
  )
}
