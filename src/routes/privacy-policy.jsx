import { PrivacyPolicy } from '../pages/Legal'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Privacy Policy',
  description: 'How The Royal Wood Shop collects, uses and protects personal information from website visitors, subscribers and customers.',
  path: '/privacy-policy',
})

export default function Route() { return <PrivacyPolicy /> }
