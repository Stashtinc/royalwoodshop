import Page from '../pages/Services'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Services',
  description: 'Consultation, material estimates and quotations, delivery across the GTA and York Region, and saw blade sharpening — from The Royal Wood Shop.',
  path: '/services',
})

export default function Route() { return <Page /> }
