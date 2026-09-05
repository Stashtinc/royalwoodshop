import Quotation from '../pages/Quotation'
import { pageMeta } from '../seo'

export const meta = () => [
  ...pageMeta({
    title: 'Work Order',
    description: 'Work order for The Royal Wood Shop website rebuild.',
    path: '/quotation',
  }),
  { name: 'robots', content: 'noindex, follow' },
]

export default function Route() { return <Quotation /> }
