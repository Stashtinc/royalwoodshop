/**
 * The site's standalone pages — the ones that aren't generated from the
 * product catalogue or the article list.
 *
 * One list, imported by both the prerender config and the sitemap. They each
 * used to keep their own copy, which meant a new page could be prerendered but
 * missing from the sitemap, or listed in the sitemap and never built. Adding a
 * page here does both.
 *
 * Service and article pages are deliberately not here: they keep the addresses
 * WordPress used and are listed explicitly alongside their own data.
 */

export const STATIC_PAGES = [
  '/',
  '/products',
  '/contact',
  '/the-royal-edge',
  '/core-values',
  '/environmental-commitment',
  '/services',
  '/resources',
  '/resources/downloads',
]
