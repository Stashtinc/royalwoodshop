import Page from '../pages/InstallationTips'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Installation Tips',
  description:
    'Practical guidance for installing crown moulding and interior trim — nailing, cutting, material selection, and tool requirements.',
  path: '/resources/installation-tips',
})

export default function Route() { return <Page /> }
