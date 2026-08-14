import Home from '../pages/Home'
import { pageMeta, BASE, SITE } from '../seo'

export const meta = () => pageMeta({
  title: 'Architectural Trim & Interior Doors GTA Ontario',
  description: 'Premium architectural trim, interior doors and wood products serving contractors, designers and homeowners across the GTA and York Region since 1982.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE,
    url: BASE,
    telephone: '+1-905-727-1387',
    email: 'info@royalwoodshop.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '18237 Woodbine Ave',
      addressLocality: 'East Gwillimbury',
      addressRegion: 'ON',
      postalCode: 'L0G 1V0',
      addressCountry: 'CA',
    },
    openingHours: ['Mo-Fr 07:00-17:30', 'Sa 09:00-16:00'],
  },
})

export default function Route() { return <Home /> }
