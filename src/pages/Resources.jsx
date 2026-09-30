import { Link } from 'react-router'
import { resourcesMenu } from '../data/navMenus'

/** One line on each, taken from the page's own search description. */
const LEADS = {
  '/blog': 'Stories, trends, product highlights and practical guidance on trim, mouldings, interior doors and millwork.',
  '/resources/downloads': 'Product catalogues and brochures: Royal Woodworking and the Alexandria East Quick Ship range.',
  '/glossary': 'A plain-language reference for the trim and millwork terms you will come across, from architrave to wainscoting.',
  '/faq': 'Common questions about trim, moulding, doors and installation, answered by our team.',
  '/installation-tips': 'Practical guidance for installing crown moulding and interior trim: nailing, cutting, materials and tools.',
}

/**
 * The resources index. The footer, the site search and the breadcrumbs on
 * every resource page link here; it lists the same pages as the Resources
 * menu, so the two cannot drift apart.
 */
export default function Resources() {
  const pages = resourcesMenu.filter((item) => typeof item === 'object' && item.path)
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">Resources</h1>
          <p className="max-w-[640px] font-sans text-lg leading-relaxed text-gray-600">
            Installation tips, a glossary of millwork terms, answers to common questions,
            catalogues to download, and articles from our blog.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:px-8">
          {pages.map((page) => (
            <Link
              key={page.path}
              to={page.path}
              className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8 transition-shadow duration-300 hover:shadow-lg"
            >
              <p className="font-serif text-xl font-bold text-[#24140d] group-hover:text-royal-blue">
                {page.label}
              </p>
              {LEADS[page.path] && (
                <p className="font-sans text-base leading-relaxed text-gray-600">{LEADS[page.path]}</p>
              )}
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-sans text-sm font-medium text-royal-blue">
                Open
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
