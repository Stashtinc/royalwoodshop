import { productsMenu, servicesMenu, aboutMenu, resourcesMenu } from './navMenus'
import { productCategories } from './productCategories'
import { catalogueProducts } from './catalogueProducts'

// Menu items are either a bare label or { label | name, path }; an item's own
// path wins, so a category result opens that category instead of the whole catalogue.
function entries(items, fallback, group) {
  return items.map((item) => typeof item === 'string'
    ? { label: item, path: fallback, group }
    : { label: item.label ?? item.name, path: item.path && item.path !== '#' ? item.path : fallback, group })
}

const allEntries = [
  { label: 'Products', path: '/products', group: 'Pages' },
  { label: 'Services', path: '/services', group: 'Pages' },
  { label: 'About Royal', path: '/#about', group: 'Pages' },
  { label: 'Contact Us', path: '/contact', group: 'Pages' },
  { label: 'Resources', path: '/resources', group: 'Pages' },

  ...entries(productCategories, '/products', 'Products'),
  ...entries(productsMenu.categories, '/products', 'Products'),
  ...entries(servicesMenu, '/services', 'Services'),
  ...entries(aboutMenu, '/#about', 'About Royal'),
  ...entries(resourcesMenu, '/resources', 'Resources'),

  // Individual catalogue products — deep-links to the catalogue page pre-filtered
  // to that product's code (see Catalogue.jsx reading the ?code= param).
  ...catalogueProducts.map((product) => ({
    label: product.name,
    code: product.productCode,
    path: `/products?code=${encodeURIComponent(product.productCode)}`,
    group: 'Products',
  })),
]

const seen = new Set()
export const searchIndex = allEntries.filter((e) => {
  const key = `${e.label?.toLowerCase()}|${e.path}`
  if (!e.label || seen.has(key)) return false
  seen.add(key)
  return true
})
