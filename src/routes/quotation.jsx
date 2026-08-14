import Quotation from '../pages/Quotation'
import { pageMeta } from '../seo'

export const meta = () => [
  ...pageMeta({
    title: 'Request a Quotation',
    description: 'Request a material estimate or quotation from The Royal Wood Shop.',
    path: '/quotation',
  }),
  { name: 'robots', content: 'noindex, follow' },
]

export default function Route() { return <Quotation /> }
