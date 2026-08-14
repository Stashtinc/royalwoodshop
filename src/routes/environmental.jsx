import Page from '../pages/EnvironmentalCommitment'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Environmental Commitment',
  description: 'FSC-certified and CARB-compliant products, paired with responsible recycling and material reuse practices.',
  path: '/environmental-commitment',
})

export default function Route() { return <Page /> }
