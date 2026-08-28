import Page from '../pages/FAQ'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'FAQ',
  description:
    'Common questions about trim, moulding, doors, and installation answered by the team at The Royal Wood Shop.',
  path: '/resources/faq',
})

export default function Route() { return <Page /> }
