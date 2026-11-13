import { TermsAndConditions } from '../pages/Legal'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Terms and Conditions',
  description: 'Payment, return, random foot lumber and special order terms for The Royal Wood Shop.',
  path: '/terms-and-conditions',
})

export default function Route() { return <TermsAndConditions /> }
