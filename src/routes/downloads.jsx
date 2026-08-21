import Page from '../pages/Downloads'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Downloads',
  description:
    'Download product catalogues and brochures from The Royal Wood Shop — Royal Woodworking and the Alexandria East Quick Ship range.',
  path: '/resources/downloads',
})

export default function Route() { return <Page /> }
