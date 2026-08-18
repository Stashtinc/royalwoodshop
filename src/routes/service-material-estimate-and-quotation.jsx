import ServiceDetail from '../pages/ServiceDetail'
import { getService } from '../data/services'
import { pageMeta } from '../seo'

const service = getService('material-estimate-and-quotation')

export const meta = () => pageMeta({
  title: service.seoTitle,
  description: service.seoDescription,
  path: service.path,
})

export default function Route() { return <ServiceDetail service={service} /> }
