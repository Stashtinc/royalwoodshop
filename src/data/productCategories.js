import catInteriorTrim from '../assets/images/cat-interior-trim.jpg'
import catInteriorDoors from '../assets/images/cat-interior-doors.jpg'
import catCustomMillwork from '../assets/images/cat-custom-millwork.jpg'
import catWallCeiling from '../assets/images/cat-wall-ceiling.jpg'
import catFlatStock from '../assets/images/cat-flat-stock.jpg'
import catStairsRailings from '../assets/images/cat-stairs-railings.jpg'
import catSheetStock from '../assets/images/cat-sheet-stock.jpg'
import catWoodComposite from '../assets/images/cat-wood-composite.jpg'

export const productCategories = [
  {
    name: 'Interior Trim & Mouldings',
    path: '/products/trim-mouldings',
    image: catInteriorTrim,
    description:
      'We stock a large inventory of interior trim profiles suitable for both modern and traditional homes.',
  },
  {
    name: 'Interior Doors – Stock & Custom',
    path: '/products/interior-doors',
    image: catInteriorDoors,
    description:
      'From standard six-panel doors to fully custom designs, we supply doors for every style and budget.',
  },
  // No catalogue category for millwork yet, so this opens the whole catalogue.
  {
    name: 'Custom Millwork',
    path: '/products',
    image: catCustomMillwork,
    description:
      'Our in-house millwork shop can match or create custom profiles to bring your vision to life.',
  },
  {
    name: 'Wall & Ceiling Panelling',
    path: '/products/wall-ceiling-panelling',
    image: catWallCeiling,
    description:
      'Add architectural detail with our range of wall and ceiling panelling systems, in-stock and made-to-order.',
  },
  {
    name: 'Flat Stock & Dimensional Boards',
    path: '/products/flat-stock-lumber',
    image: catFlatStock,
    description: 'A wide selection of flat stock and dimensional lumber, ready for your next project.',
  },
  {
    name: 'Stairs & Railings',
    path: '/products/stair-railing',
    image: catStairsRailings,
    description: 'Stock and custom staircase components, railings, and balusters built to last.',
  },
  {
    name: 'Sheet Stock',
    path: '/products/sheet-stock',
    image: catSheetStock,
    description: 'MDF, plywood, and specialty sheet goods stocked in a range of sizes and thicknesses.',
  },
  {
    name: 'Wood & Composite Siding',
    path: '/products/siding',
    image: catWoodComposite,
    description:
      'Durable, low-maintenance siding options in both natural wood and composite materials.',
  },
]
