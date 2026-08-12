import { productsMenu, servicesMenu, aboutMenu, resourcesMenu } from './navMenus'
import { productCategories } from './productCategories'
import { catalogueProducts } from './catalogueProducts'

function entries(labels, path, group) {
  return labels.map((label) => ({ label, path, group }))
}

export const searchIndex = [
  { label: 'Products', path: '/trim-doors-catalogue', group: 'Pages' },
  { label: 'Services', path: '/services', group: 'Pages' },
  { label: 'About Royal', path: '/#about', group: 'Pages' },
  { label: 'Contact Us', path: '/contact', group: 'Pages' },
  { label: 'Resources', path: '/resources', group: 'Pages' },

  ...entries(
    productCategories.map((category) => category.name),
    '/trim-doors-catalogue',
    'Products',
  ),
  ...productsMenu.groups.flatMap((group) =>
    entries(group.items, '/trim-doors-catalogue', 'Products'),
  ),
  ...entries(productsMenu.items, '/trim-doors-catalogue', 'Products'),
  ...entries(servicesMenu, '/services', 'Services'),
  ...entries(aboutMenu, '/#about', 'About Royal'),
  ...entries(resourcesMenu, '/resources', 'Resources'),

  // Individual catalogue products — deep-links to the catalogue page pre-filtered
  // to that product's code (see Catalogue.jsx reading the ?code= param).
  ...catalogueProducts.map((product) => ({
    label: product.name,
    code: product.productCode,
    path: `/trim-doors-catalogue?code=${encodeURIComponent(product.productCode)}`,
    group: 'Products',
  })),
]
