import Placeholder from '../pages/Placeholder'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Services',
  description: 'Consultation, material estimates and quotations, delivery throughout the GTA, saw blade sharpening and pre-hanging services.',
  path: '/services',
})

export default function Route() { return <Placeholder title="Services" /> }
