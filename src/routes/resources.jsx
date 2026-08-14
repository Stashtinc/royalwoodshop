import Placeholder from '../pages/Placeholder'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Resources',
  description: 'Installation tips, a glossary of millwork terms, frequently asked questions and articles from the Royal Wood Shop journal.',
  path: '/resources',
})

export default function Route() { return <Placeholder title="Resources" /> }
