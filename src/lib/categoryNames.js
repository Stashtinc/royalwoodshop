import { useRouteLoaderData } from 'react-router'
import navCatsJson from '../data/navCategories.json'

/**
 * Category names as the shop has them in the database (Admin → Categories),
 * so the footer and homepage cards say exactly what the header menu says.
 *
 * The root loader already reads the categories for the header; this reuses
 * them. Entries are matched by `slug`; anything without one (Custom Millwork
 * is a page, not a product category), or a slug the database doesn't have,
 * keeps the name written in the code.
 */
export function useCategoryName() {
  const loaded = useRouteLoaderData('root')?.navCategories
  const cats = loaded?.length ? loaded : navCatsJson
  const bySlug = new Map(cats.map((c) => [c.slug, c.name]))
  return (entry) => (entry.slug && bySlug.get(entry.slug)) || entry.name
}
