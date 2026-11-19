import { requireUser } from '../../lib/auth.server'
import { UPLOAD_DIR, saveMediaUpload } from '../../lib/uploads.server'

// Images for the article editor's Image button. Signed-in admins only.
// GET lists the media library; POST uploads one file and returns its address.

const IMAGE_RE = /\.(webp|jpe?g|png)$/i

export async function loader({ request }) {
  await requireUser(request)
  const { readdir } = await import('node:fs/promises')
  let files = []
  try {
    files = (await readdir(UPLOAD_DIR)).filter((f) => IMAGE_RE.test(f))
  } catch {
    files = []
  }
  files.sort((a, b) => a.localeCompare(b))
  return Response.json({ images: files.map((name) => ({ name, url: `/uploads/${name}` })) })
}

export async function action({ request }) {
  await requireUser(request)
  const f = await request.formData()
  const res = await saveMediaUpload(f.get('file'))
  if (res.error) return Response.json({ error: res.error }, { status: 400 })
  return Response.json({ name: res.name, url: `/uploads/${res.name}` })
}
