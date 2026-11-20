import { requireUser } from '../../lib/auth.server'
import { rewritePassage } from '../../lib/ai.server.js'

// Rewrites one highlighted passage for the article editor. Signed-in admins only.
// Returns { html } for the editor to place in the passage; nothing is saved here.
export async function action({ request }) {
  await requireUser(request)
  const body = await request.json().catch(() => ({}))
  try {
    const out = await rewritePassage({
      passage: String(body.passage ?? ''),
      instruction: String(body.instruction ?? ''),
      context: String(body.context ?? ''),
    })
    return Response.json(out)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
