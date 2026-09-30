import path from 'node:path'
import { createRequestHandler } from '@react-router/express'
import compression from 'compression'
import express from 'express'
import morgan from 'morgan'

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production'

const BUILD_DIR = path.join(import.meta.dirname, 'build/client')
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST

const build = await import('./build/server/index.js')

const app = express()
app.disable('x-powered-by')
app.use(compression())

// Uploads are served from the site's own domain, so a file that can carry a
// script (an SVG stored before uploads refused them, or anything else that
// reached the volume) would run as royalwoodshop.com if opened directly.
// Raster images are served as normal; anything else gets a policy that runs
// nothing. Registered before every static handler, because the build copies
// public/uploads too. Pictures shown with <img> are unaffected either way.
const RASTER = /\.(webp|jpe?g|png|avif|gif)$/i
app.use('/uploads', (req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  if (!RASTER.test(req.path)) {
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
  }
  next()
})

// Hashed static assets — long cache
app.use(
  '/assets',
  express.static(path.join(BUILD_DIR, 'assets'), { immutable: true, maxAge: '1y' }),
)

// Other built client files
app.use(express.static(BUILD_DIR, { maxAge: '1h' }))

// Public directory (includes uploads committed to git)
app.use(express.static('public', { maxAge: '1h' }))

// Uploaded images from the Railway volume (or local public/uploads in dev).
// Serves /uploads/* from wherever UPLOAD_DIR points so Railway's persistent
// volume is accessible at the same URL path as the committed images.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h' }))

app.use(morgan('tiny'))

app.all('*', createRequestHandler({ build }))

const onListen = (err) => {
  if (err) { console.error(err); process.exit(1) }
  console.log(`Listening on http://${HOST ?? 'localhost'}:${PORT}`)
}

const server = HOST ? app.listen(PORT, HOST, onListen) : app.listen(PORT, onListen)

// Railway stops the old container with SIGTERM once a new deploy is live.
// Without a handler Node dies from the signal with a non-zero exit code, and
// Railway reports that as "Deploy Crashed" on every deploy. Stop taking new
// connections, let requests in flight finish, then exit cleanly. The timer
// is a backstop for keep-alive connections that never close on their own.
let stopping = false
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (stopping) return
    stopping = true
    console.log(`${signal} received — finishing in-flight requests and shutting down`)
    server.close(() => process.exit(0))
    server.closeIdleConnections?.()
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}
