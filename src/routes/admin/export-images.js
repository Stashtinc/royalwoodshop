import { createReadStream, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { requireUser } from '../../lib/auth.server'
import { UPLOAD_DIRS } from '../../lib/uploads.server'

export async function loader({ request }) {
  await requireUser(request)

  // Full-size originals only, not the responsive variants (-320, -640, etc.),
  // from every upload folder. A name in more than one folder is taken once,
  // from the first (newest) folder.
  const files = new Map()
  for (const dir of UPLOAD_DIRS) {
    let names = []
    try { names = readdirSync(dir) } catch { continue }
    for (const f of names) {
      if (!/\.(webp|jpg|jpeg|png|svg|avif)$/i.test(f) || /-\d+\.(webp|jpg|jpeg|png|svg|avif)$/i.test(f)) continue
      if (!files.has(f)) files.set(f, join(dir, f))
    }
  }

  if (!files.size) {
    return new Response('No images found.', { status: 404 })
  }

  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('node:stream')

  const pass = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 1 } })

  archive.on('error', (err) => { pass.destroy(err) })
  archive.pipe(pass)

  for (const [file, fullPath] of files) {
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
