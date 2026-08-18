import Page from '../pages/services/Sharpening'
import { getService } from '../data/services'
import { pageMeta } from '../seo'

const service = getService('saw-blade-sharpening')

export const meta = () => pageMeta({
  title: service.seoTitle,
  description: service.seoDescription,
  path: service.path,
})

export default function Route() { return <Page /> }
