import Page from '../pages/WoodSiding'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Wood Siding',
  description: 'Cape Cod pre-finished Canadian wood siding, Western Lodgepole Pine, kiln dried and finished with a two-coat acrylic system backed by a 15-year warranty.',
  path: '/wood-siding',
})

export default function Route() { return <Page /> }
