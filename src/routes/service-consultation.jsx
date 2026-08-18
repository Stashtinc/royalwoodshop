import Page from '../pages/services/Consultation'
import { getService } from '../data/services'
import { pageMeta } from '../seo'

const service = getService('consultation')

export const meta = () => pageMeta({
  title: service.seoTitle,
  description: service.seoDescription,
  path: service.path,
})

export default function Route() { return <Page /> }
