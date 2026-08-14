import Page from '../pages/CoreValues'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Core Values',
  description: 'The principles behind how The Royal Wood Shop has served contractors, designers and homeowners since 1982.',
  path: '/core-values',
})

export default function Route() { return <Page /> }
