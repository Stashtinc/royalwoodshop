import Page from '../pages/Glossary'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Glossary of Millwork Terms',
  description:
    'A plain-language reference for the trim and millwork terms you\'ll encounter at The Royal Wood Shop — from architrave to wainscoting.',
  path: '/resources/glossary',
})

export default function Route() { return <Page /> }
