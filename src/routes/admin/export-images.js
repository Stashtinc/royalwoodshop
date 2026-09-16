import { createReadStream, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { requireUser } from '../../lib/auth.server'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'

export async function loader({ request }) {
  await requireUser(request)

  let files
  try {
    files = readdirSync(UPLOAD_DIR).filter((f) => {
      // Only include the full-size originals, not the responsive variants (-320, -640, etc.)
      return /\.(webp|jpg|jpeg|png|svg|avif)$/i.test(f) && !/-\d+\.(webp|jpg|jpeg|png|svg|avif)$/i.test(f)
    })
  } catch {
    return new Response('Upload directory not found.', { status: 404 })
  }

  if (!files.length) {
    return new Response('No images found.', { status: 404 })
  }

  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('node:stream')

  const pass = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 1 } })

  archive.on('error', (err) => { pass.destroy(err) })
  archive.pipe(pass)

  for (const file of files) {
    const fullPath = join(UPLOAD_DIR, file)
    try {
      statSync(fullPath)
      archive.append(createReadStream(fullPath), { name: file })
    } catch { /* skip missing */ }
  }

  archive.finalize()

  const chunks = []
  for await (const chunk of pass) chunks.push(chunk)
  const buf = Buffer.concat(chunks)

  const date = new Date().toISOString().slice(0, 10)
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="RoyalWoodShop_Images_${date}.zip"`,
    },
  })
}
