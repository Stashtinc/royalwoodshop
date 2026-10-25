import CatalogueTabs from './CatalogueTabs'

/** Products | Catalogue tabs: the same bar as Categories | Attributes. `active` is the page shown. */
const TABS = [
  { key: 'products', label: 'Products', to: '/admin/products' },
]

export default function SectionTabs({ active }) {
  return <CatalogueTabs active={active} tabs={TABS} />
}
