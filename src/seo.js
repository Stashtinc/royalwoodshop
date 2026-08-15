export const SITE = 'The Royal Wood Shop'
/** Vite only exposes VITE_-prefixed variables to the browser, and `process`
 *  does not exist there at all. This module is imported by every route for its
 *  meta export, so it must be safe on both sides. */
export const BASE =
  import.meta.env.VITE_SITE_URL || 'https://www.royalwoodshop.com'

/** Every page gets a unique title, a description and a self-referencing
 *  canonical. The absence of these on the old site is why several hundred
 *  product pages could not rank. */
export function pageMeta({ title, description, path, image, jsonLd }) {
  const url = `${BASE}${path}`
  const tags = [
    // Titles carried over from WordPress often already end in the business
    // name, in one form or another. Appending it again reads badly and wastes
    // characters Google will truncate.
    { title: /royal\s*wood\s*shop/i.test(title) ? title : `${title} | ${SITE}` },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@RoyalWoodShop' },
  ]
  if (image) {
    tags.push({ property: 'og:image', content: image })
  }
  if (jsonLd) {
    tags.push({ 'script:ld+json': jsonLd })
  }
  return tags
}

export const truncate = (s, n = 155) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/[,;:\s]+\S*$/, '')}…`
}
