import Page from '../pages/WhatMakesUsDifferent'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'What Makes Us Different',
  description: 'Focused expertise in trim, doors and millwork, a large in-stock selection, reliable local supply and a price match guarantee.',
  path: '/the-royal-edge',
})

export default function Route() { return <Page /> }
