import { Link } from 'react-router'

/** The tab bar used across the admin: Categories | Attributes, Products | Catalogue.
 *  `tabs` is [{ key, label, to }]; `active` is the key of the page being shown. */
export const CATEGORY_TABS = [
  { to: '/admin/categories', key: 'categories', label: 'Categories' },
  { to: '/admin/attributes', key: 'attributes', label: 'Attributes' },
]

export default function CatalogueTabs({ active, tabs = CATEGORY_TABS }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          role="tab"
          aria-selected={active === t.key}
          className={`-mb-px border-b-2 px-4 pb-2.5 font-sans text-sm font-medium transition-colors ${
            active === t.key
              ? 'border-royal-blue text-royal-blue'
              : 'border-transparent text-gray-500 hover:text-tundora'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
