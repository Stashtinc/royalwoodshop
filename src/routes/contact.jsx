import Page from '../pages/Contact'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Contact Us',
  description: 'Visit our East Gwillimbury showroom, or get in touch about trim, doors and custom millwork for your project. Delivery throughout the GTA and York Region.',
  path: '/contact',
})

export default function Route() { return <Page /> }
