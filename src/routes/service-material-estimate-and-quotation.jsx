import Page from '../pages/services/Estimate'
import { getService } from '../data/services'
import { pageMeta } from '../seo'

const service = getService('material-estimate-and-quotation')

export const meta = () => pageMeta({
  title: service.seoTitle,
  description: service.seoDescription,
  path: service.path,
})

// The enquiry form on this page posts here: emailed to sales@ like /contact.
export async function action({ request }) {
  const { handleEnquiry } = await import('../lib/contact.server')
  return handleEnquiry(request, { source: 'estimate', requirePhone: true, requireMessage: false })
}

export default function Route() { return <Page /> }
