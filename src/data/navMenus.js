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
  groups: [
    {
      heading: 'Trim & Mouldings Catalogue',
      items: [
        { label: 'Stock Trim Profile List', path: '/products?category=trim-mouldings' },
        'Price List',
        'Curved & Arched Trim Made to Order',
        'Flexible Trim',
        'Custom Trim Made to Order',
        'Quick Ship Alexandria Mouldings',
        'Royal Woodworking Brochure',
      ],
    },
    {
      heading: 'Interior Doors',
      items: [
        { label: 'Interior Doors Product Catalogue', path: '/products?category=interior-doors' },
        'KN Crowder Sliding Door Tracks',
        'TRIMLITE Door Brochure 2026',
        'Door Handing Sheet',
        'Pre-Hanging Service',
      ],
    },
  ],
  items: [
    { label: 'Full Product Catalogue', path: '/products' },
    'S4S Flat Stock Lumber and Primed Dimensional Boards',
    'Paneling Surfaces',
    { label: 'Staircase & Railing', path: '/products?category=stair-railing' },
    '4×8 Sheet Panels',
    'Wood & Composite Siding',
    {
      label: 'Door Hardware, Handles & Sliding Systems in Toronto & GTA',
      path: '/products?category=door-hardware',
    },
    'Columns & Post Covers',
    'Fit & Finish Essentials',
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
  'Glossary of Terms',
  'FAQ',
  'Installation Tips',
  'Royal Wood Shop LTD on "Made to Renovate"',
]
