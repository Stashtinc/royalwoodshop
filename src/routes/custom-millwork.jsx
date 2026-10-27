import Page from '../pages/CustomMillwork'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Custom Millwork',
  description: 'Custom trim and mouldings: we reproduce hardwood moulding profiles and made-to-order interior doors for projects that need specific dimensions, species or architectural details.',
  path: '/custom-millwork',
})

export default function Route() { return <Page /> }
