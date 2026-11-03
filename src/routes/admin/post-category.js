import { requireUser } from '../../lib/auth.server'
import { createCategory } from '../../lib/posts.server'

/** POST /admin/post-categories: adds a blog category from the post editor, and returns it. */
export async function action({ request }) {
  await requireUser(request)
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
  const form = await request.formData()
  try {
    const category = await createCategory(form.get('name'))
    return Response.json({ category })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
