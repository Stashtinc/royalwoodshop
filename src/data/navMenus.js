// Mirrors the nav structure on royalwoodshop.com.
//
// An item written as a bare string has no destination yet and renders as "#".
// An item with a path is live. Anything built on this site must be given its
// path here, or the nav quietly keeps pointing at nothing — which is what
// happened to the blog: 37 articles published and no way to reach them.
//
// Product entries that correspond to a catalogue category link to
// /products?category=<slug>, which opens the catalogue with that category
// ticked in the sidebar. Slugs come from CATEGORY_SLUGS in data/catalogue.js
// and must match it — there are only four:
//   trim-mouldings · interior-doors · door-hardware · stair-railing
//
// The rest are still "#": they were separate pages or PDFs on WordPress
// (price lists, brochures, panelling, siding, columns, S4S) and have no
// catalogue category behind them. Guessing a category for those would send
// people to the wrong products, which is worse than a dead link.

export const productsMenu = {
  categories: [
    { label: 'Trim & Moulding',         path: '/products?category=trim-mouldings' },
    { label: 'Interior Doors',           path: '/products?category=interior-doors' },
    { label: 'Stair Components',         path: '/products?category=stair-components' },
    { label: 'Door Hardware',            path: '/products?category=door-hardware' },
    { label: 'Sheet Stock',              path: '/products?category=sheet-stock' },
    { label: 'Wall & Ceiling Panelling', path: '/products?category=wall-ceiling-panelling' },
    { label: 'Siding',                   path: '/products?category=siding' },
  ],
}

export const servicesMenu = [
  { label: 'All Services', path: '/services' },
  { label: 'Consultation', path: '/consultation' },
  { label: 'Estimate & Quotation', path: '/material-estimate-and-quotation' },
  { label: 'Delivery Service', path: '/services/delivery' },
  { label: 'Saw Blade Sharpening', path: '/saw-blade-sharpening' },
  'Pre-Hanging Service',
]

export const aboutMenu = [
  { label: 'What Makes Us Different', path: '/the-royal-edge' },
  { label: 'Core Values', path: '/core-values' },
  { label: 'Environmental Commitment', path: '/environmental-commitment' },
]

export const resourcesMenu = [
  { label: 'Blog', path: '/blog' },
  { label: 'Downloads', path: '/resources/downloads' },
  { label: 'Glossary of Terms', path: '/resources/glossary' },
  { label: 'FAQ', path: '/resources/faq' },
  { label: 'Installation Tips', path: '/resources/installation-tips' },
  'Royal Wood Shop LTD on "Made to Renovate"',
]
