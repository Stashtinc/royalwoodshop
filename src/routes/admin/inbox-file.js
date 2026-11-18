import { requireUser } from '../../lib/auth.server'
import { getQuoteFile } from '../../lib/inbox.server.js'

// A quote attachment, for signed-in admins. Served as a download, never inline,
// because customer plans are documents and are not meant for public URLs.
export async function loader({ request, params }) {
  await requireUser(request)
  const file = await getQuoteFile(Number(params.id))
  if (!file) return new Response('Not found', { status: 404 })
  const name = file.filename.replace(/[^\w.\- ]/g, '_')
  return new Response(file.data, {
    headers: {
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
