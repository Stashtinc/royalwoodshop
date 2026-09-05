import { Link } from 'react-router'
import { productsMenu, servicesMenu, aboutMenu, resourcesMenu } from '../data/navMenus'

const PANEL_WIDTH = 'w-[720px]'

function MenuColumn({ heading, items }) {
  return (
    <div className="flex flex-col gap-3">
      {heading && <p className="font-serif text-sm font-bold text-royal-blue">{heading}</p>}
      <ul className="flex flex-col gap-1 -mx-2">
        {items.map((item) => {
          const label = typeof item === 'string' ? item : item.label
          const path = typeof item === 'string' ? null : item.path
          const className =
            'block rounded-md px-2 py-1.5 font-body text-[15px] text-gray-600 transition-colors hover:bg-royal-blue/5 hover:text-royal-blue'
          return (
            <li key={label}>
              {path ? (
                <Link to={path} className={className}>
                  {label}
                </Link>
              ) : (
                <a href="#" className={className}>
                  {label}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function HighlightColumn({ eyebrow, title, description, ctaLabel, ctaTo }) {
  return (
    <div className="flex flex-col gap-3 bg-[#f0f0f0] p-5">
      {eyebrow && (
        <p className="font-body text-xs font-bold tracking-wide text-royal-blue uppercase">
          {eyebrow}
        </p>
      )}
      <p className="font-serif text-lg leading-snug font-bold text-[#24140d]">{title}</p>
      <p className="font-body text-sm leading-relaxed text-gray-600">{description}</p>
      <Link
        to={ctaTo}
        className="mt-1 w-fit rounded-lg border border-royal-blue bg-royal-blue px-4 py-2 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

function ProductsPanel() {
  return (
    <div className={`grid ${PANEL_WIDTH} grid-cols-[1fr_220px] bg-white shadow-2xl`}>
      <div className="flex flex-col gap-1 p-6 -mx-2">
        <p className="font-serif text-sm font-bold text-royal-blue px-2 mb-2">Browse by Category</p>
        {productsMenu.categories.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="block rounded-md px-2 py-2 font-body text-[15px] text-gray-700 transition-colors hover:bg-royal-blue/5 hover:text-royal-blue"
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/products"
          className="mt-3 px-2 font-sans text-sm font-medium text-royal-blue hover:underline"
        >
          View full catalogue →
        </Link>
      </div>
      <HighlightColumn
        eyebrow="In-Stock & Ready"
        title="Toronto's trim & door specialists"
        description="Browse hundreds of mouldings, doors, and hardware available for pickup or delivery across the GTA."
        ctaLabel="Shop Now"
        ctaTo="/products"
      />
    </div>
  )
}

function ServicesPanel() {
  return (
    <div className={`grid ${PANEL_WIDTH} grid-cols-2 gap-8 bg-white p-6 shadow-2xl`}>
      <MenuColumn heading="Our Services" items={servicesMenu} />
      <HighlightColumn
        eyebrow="Need a hand?"
        title="Get a free project estimate"
        description="Tell us about your renovation or build and we'll put together a no-obligation quote."
        ctaLabel="Get a Quote"
        ctaTo="/contact"
      />
    </div>
  )
}

function AboutPanel() {
  return (
    <div className={`grid ${PANEL_WIDTH} grid-cols-2 gap-8 bg-white p-6 shadow-2xl`}>
      <MenuColumn heading="About Royal" items={aboutMenu} />
      <HighlightColumn
        eyebrow="Since 1982"
        title="Serving York Region & the GTA"
        description="A leading specialized supplier of interior trim, mouldings, and doors for upscale renovation and new build projects."
        ctaLabel="Visit Showroom"
        ctaTo="/contact"
      />
    </div>
  )
}

function ResourcesPanel() {
  return (
    <div className={`grid ${PANEL_WIDTH} grid-cols-2 gap-8 bg-white p-6 shadow-2xl`}>
      <MenuColumn heading="Resources" items={resourcesMenu} />
      <HighlightColumn
        eyebrow="From the Blog"
        title="Latest tips & product guides"
        description="Buying guides, trend pieces, and how-tos to help you plan your next project."
        ctaLabel="View All Posts"
        ctaTo="/#products"
      />
    </div>
  )
}

export default function NavDropdownPanel({ menu }) {
  if (menu === 'products') return <ProductsPanel />
  if (menu === 'services') return <ServicesPanel />
  if (menu === 'about') return <AboutPanel />
  if (menu === 'resources') return <ResourcesPanel />
  return null
}
