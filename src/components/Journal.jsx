import blogVents from '../assets/images/blog-vents-full.webp'
import blogPoplarMdf from '../assets/images/blog-poplar-mdf-full.jpg'
import blogInteriorDoors from '../assets/images/blog-interior-doors-full.jpg'

// Pulled from royalwoodshop.com/blog — the 3 most recent posts as of this build
const posts = [
  {
    date: 'June 18, 2026',
    title: 'Why Aria & Fittes Vents Are the Perfect Finishing Touch for Modern Interiors',
    excerpt:
      'When it comes to modern interior design, it’s often the smallest details that make the biggest impact.',
    image: blogVents,
    href: 'https://www.royalwoodshop.com/aria-fittes-vents-finishing-touches-modern-interiors/',
  },
  {
    date: 'June 16, 2026',
    title: 'Poplar vs MDF Trim in Toronto & the GTA: Cost, Quality & Best Applications',
    excerpt:
      'Choosing between wood and MDF is one of the most common decisions contractors and homeowners face.',
    image: blogPoplarMdf,
    href: 'https://www.royalwoodshop.com/poplar-vs-mdf-trim-in-cost-quality-best-applications/',
  },
  {
    date: 'May 21, 2026',
    title: 'How to Choose the Best Interior Door for Your Space',
    excerpt:
      'Interior doors do far more than separate rooms. The right door can completely change the overall aesthetic.',
    image: blogInteriorDoors,
    href: 'https://www.royalwoodshop.com/how-to-choose-the-best-interior-door-for-your-space/',
  },
]

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
          {posts.map((post) => (
            <a
              key={post.title}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-lg md:flex-col md:gap-0 md:p-0"
            >
              <div className="aspect-square w-28 shrink-0 overflow-hidden rounded-xl md:aspect-[4/3] md:w-full md:rounded-none">
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5 md:gap-3 md:p-6">
                <span className="font-sans text-[11px] font-medium tracking-wide text-gray-400 uppercase md:text-xs">
                  {post.date}
                </span>

                <h3 className="line-clamp-2 font-serif text-base leading-snug font-bold text-[#24140d] group-hover:text-royal-blue md:line-clamp-none md:text-xl">
                  {post.title}
                </h3>

                <p className="line-clamp-2 font-sans text-xs leading-relaxed text-gray-600 md:line-clamp-none md:text-sm">
                  {post.excerpt}
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
            </a>
          ))}
        </div>

        <a
          href="https://www.royalwoodshop.com/blog/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-4 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
        >
          View All Posts
        </a>
      </div>
    </section>
  )
}
