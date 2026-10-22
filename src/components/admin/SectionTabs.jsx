import { Link } from 'react-router'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ProductsIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true" {...stroke}>
    <path d="M10 2.2 17.3 6v8L10 17.8 2.7 14V6z" />
    <path d="M2.9 6 10 9.8 17.1 6M10 9.8v8" />
  </svg>
)

const CatalogueIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true" {...stroke}>
    <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2H16v14H5.5A1.5 1.5 0 0 0 4 17.5z" />
    <path d="M4 17.5A1.5 1.5 0 0 1 5.5 16H16" />
  </svg>
)

const TABS = [
  { key: 'products', label: 'Products', to: '/admin/products', Icon: ProductsIcon },
  { key: 'catalogue', label: 'Catalogue', to: '/admin/catalogue', Icon: CatalogueIcon },
]

/** Products / Catalogue tabs; `active` is the key of the page being shown. */
export default function SectionTabs({ active }) {
  return (
    <nav aria-label="Sections" className="flex items-center gap-6">
      {TABS.map(({ key, label, to, Icon }) => {
        const on = key === active
        return (
          <Link
            key={key}
            to={to}
            aria-current={on ? 'page' : undefined}
            className={`flex items-center gap-2 border-b-2 pb-1 font-serif text-2xl font-bold ${on ? 'border-royal-blue text-royal-blue' : 'border-transparent text-gray-400 hover:text-tundora'}`}
          >
            <Icon />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
