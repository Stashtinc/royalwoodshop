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

HOST ? app.listen(PORT, HOST, onListen) : app.listen(PORT, onListen)
