/**
 * Plain-English names for log actions.
 *
 * Shared rather than living in the page, because the search box lets someone
 * type "Article published" and the server has to know which action that is.
 */
export const ACTION_LABEL = {
  'setup.schema': 'Database created',
  'setup.catalogue': 'Catalogue imported',
  'setup.redirects': 'Redirects loaded',
  'import.species': 'Species sheet imported',
  'site.published': 'Site published',
  'product.status': 'Visibility changed',
  'product.created': 'Product added',
  'product.updated': 'Product edited',
  'image.added': 'Images added',
  'image.updated': 'Image details changed',
  'image.deleted': 'Image removed',
  'image.reordered': 'Images reordered',
  'auth.login': 'Signed in',
  'post.created': 'Article added',
  'post.updated': 'Article edited',
  'post.published': 'Article published',
  'user.renamed': 'Sign-in address changed',
  'image.generated': 'AI image used',
  'ai.article': 'AI drafted an article',
  'ai.metadata': 'AI wrote the search listing',
  'ai.images': 'AI rendered images',
  'build.shipped': 'Feature built',
}

/** Actions whose label or raw name contains the typed text. */
export function actionsMatching(q) {
  const needle = String(q ?? '').trim().toLowerCase()
  if (!needle) return []
  return Object.entries(ACTION_LABEL)
    .filter(([action, label]) =>
      label.toLowerCase().includes(needle) || action.toLowerCase().includes(needle))
    .map(([action]) => action)
}
