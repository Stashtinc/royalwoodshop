import { Link } from 'react-router'

const TABS = [
  { key: 'products', label: 'Products', to: '/admin/products' },
  { key: 'catalogue', label: 'Catalogue', to: '/admin/catalogue' },
]

/** Products / Catalogue tabs; `active` is the key of the page being shown. */
export default function SectionTabs({ active }) {
  return (
    <nav aria-label="Sections" className="flex items-center gap-6">
      {TABS.map((tab) => {
        const on = tab.key === active
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={on ? 'page' : undefined}
            className={`border-b-2 pb-1 font-serif text-2xl font-bold ${on ? 'border-royal-blue text-tundora' : 'border-transparent text-gray-400 hover:text-tundora'}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
