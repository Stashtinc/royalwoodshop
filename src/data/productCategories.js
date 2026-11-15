import catInteriorTrim from '../assets/images/cat-interior-trim.jpg'
import catInteriorDoors from '../assets/images/cat-interior-doors.jpg'
import catCustomMillwork from '../assets/images/cat-custom-millwork.jpg'
import catWallCeiling from '../assets/images/cat-wall-ceiling.jpg'
import catFlatStock from '../assets/images/cat-flat-stock.jpg'
import catStairsRailings from '../assets/images/cat-stairs-railings.jpg'
import catSheetStock from '../assets/images/cat-sheet-stock.jpg'
import catWoodComposite from '../assets/images/cat-wood-composite.jpg'

// `name` is the fallback; the page shows the database name for `slug`
// (see useCategoryName in lib/categoryNames.js).
export const productCategories = [
  {
    name: 'Trim & Moulding',
    slug: 'trim-mouldings',
    path: '/products/trim-mouldings',
    image: catInteriorTrim,
    description:
      'Choose from our large inventory of architectural trim & Mouldings in stock.',
  },
  {
    name: 'Interior Door',
    slug: 'interior-doors',
    // The catalogue, with Interior Door selected.
    path: '/products?category=interior-doors',
    image: catInteriorDoors,
    description:
      'From standard six-panel doors to fully custom designs, we supply doors for every style and budget.',
  },
  {
    name: 'Custom Millwork',
    path: '/custom-millwork',
    image: catCustomMillwork,
    description:
      'Our in-house millwork shop can match or create custom profiles to bring your vision to life.',
  },
  {
    name: 'Wall & Ceiling Panelling',
    slug: 'wall-ceiling-panelling',
    path: '/products/wall-ceiling-panelling',
    image: catWallCeiling,
    description:
      'Add architectural detail with our range of wall and ceiling panelling systems, in-stock and made-to-order.',
  },
  {
    name: 'Flat Stock Lumber',
    slug: 'flat-stock-lumber',
    path: '/products/flat-stock-lumber',
    image: catFlatStock,
    description: 'A wide selection of flat stock and dimensional lumber, ready for your next project.',
  },
  {
    name: 'Stair & Railing',
    slug: 'stair-railing',
    path: '/products/stair-railing',
    image: catStairsRailings,
    description: 'Stock and custom staircase components, railings, and balusters built to last.',
  },
  {
    name: 'Sheet Stock',
    slug: 'sheet-stock',
    path: '/products/sheet-stock',
    image: catSheetStock,
    description: 'MDF, plywood, and specialty sheet goods stocked in a range of sizes and thicknesses.',
  },
  {
    name: 'Exterior Siding',
    slug: 'siding',
    path: '/wood-siding',
    image: catWoodComposite,
    description:
      'Durable, low-maintenance siding options in both natural wood and composite materials.',
  },
]
