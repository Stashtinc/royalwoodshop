// Mirrors the nav structure on royalwoodshop.com.
//
// An item written as a bare string has no destination yet and renders as "#".
// An item with a path is live. Anything built on this site must be given its
// path here, or the nav quietly keeps pointing at nothing — which is what
// happened to the blog: 37 articles published and no way to reach them.

export const productsMenu = {
  groups: [
    {
      heading: 'Trim & Mouldings Catalogue',
      items: [
        'Stock Trim Profile List',
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
        'Interior Doors Product Catalogue',
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
    'Staircase & Railing',
    '4×8 Sheet Panels',
    'Wood & Composite Siding',
    'Door Hardware, Handles & Sliding Systems in Toronto & GTA',
    'Columns & Post Covers',
    'Fit & Finish Essentials',
  ],
}

export const servicesMenu = [
  { label: 'All Services', path: '/services' },
  'Consultation',
  'Estimate & Quotation',
  'Delivery Service',
  'Saw Blade Sharpening',
  'Pre-Hanging Service',
]

export const aboutMenu = [
  { label: 'What Makes Us Different', path: '/the-royal-edge' },
  { label: 'Core Values', path: '/core-values' },
  { label: 'Environmental Commitment', path: '/environmental-commitment' },
]

export const resourcesMenu = [
  { label: 'Blog', path: '/blog' },
  'Glossary of Terms',
  'FAQ',
  'Installation Tips',
  'Royal Wood Shop LTD on "Made to Renovate"',
]
