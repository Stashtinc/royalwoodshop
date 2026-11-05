import Page from '../pages/PreHangingService'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Door Pre-Hanging Service',
  description: 'Door pre-hanging service: hinges, door swing, jamb and stop chosen for your wall, machined in our shop and ready to hang.',
  path: '/pre-hanging-service',
})

export default function Route() { return <Page /> }
