import { useEffect, useRef, useState } from 'react'
import { Form, useLoaderData, useActionData, useNavigation, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'

const UPLOADS_DIR = 'public/uploads'
const PAGE_SIZE = 60
// Responsive size suffixes generated at import time — not standalone images
const VARIANT_RE = /-(320|400|640|800)\.(webp|jpe?g|png)$/i

export async function loader({ request }) {
  await requireUser(request)
  const { readdir } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.toLowerCase() ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))

  // Collect files from uploads root + panelling sub-folder
  const dirs = [UPLOADS_DIR, `${UPLOADS_DIR}/panelling`].filter(existsSync)
  const allFiles = []
  for (const dir of dirs) {
    const files = await readdir(dir)
    const prefix = dir === UPLOADS_DIR ? '' : 'panelling/'
    for (const f of files) {
      if (!VARIANT_RE.test(f) && /\.(webp|jpe?g|jpg|png)$/i.test(f)) {
        allFiles.push({ name: f, path: `/uploads/${prefix}${f}`, dir })
      }
    }
  }

  allFiles.sort((a, b) => a.name.localeCompare(b.name))
  const filtered = q ? allFiles.filter(f => f.name.toLowerCase().includes(q)) : allFiles
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return { items, total: filtered.length, page, totalPages, q }
}

export async function action({ request }) {
  await requireUser(request)
  const form = await request.formData()
  const intent = form.get('intent')
  const { rename, unlink, writeFile } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')

  if (intent === 'upload') {
    const files = form.getAll('files')
    if (!files.length) return { error: 'No files selected.' }
    const saved = []
    for (const file of files) {
      if (typeof file === 'string' || file.size === 0) continue
      if (file.size > 10 * 1024 * 1024) return { error: `${file.name} exceeds 10 MB limit.` }
      const dest = `${UPLOADS_DIR}/${file.name}`
      await writeFile(dest, Buffer.from(await file.arrayBuffer()))
      saved.push(file.name)
    }
    return { ok: `Uploaded ${saved.length} file${saved.length !== 1 ? 's' : ''}.` }
  }

  if (intent === 'delete') {
    const filePath = form.get('path') // e.g. public/uploads/foo.webp
    if (!filePath || !filePath.startsWith(UPLOADS_DIR)) return { error: 'Invalid path.' }
    // Delete main + responsive variants
    const base = filePath.replace(/\.(webp|jpe?g|jpg|png)$/i, '')
    const ext = filePath.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? ''
    const toDelete = [filePath, ...[320, 400, 640, 800].map(s => `${base}-${s}${ext}`)]
    for (const p of toDelete) { try { if (existsSync(p)) await unlink(p) } catch {} }
    return { ok: 'Deleted.' }
  }

  if (intent === 'rename') {
    const oldPath = form.get('oldPath')
    const newName = form.get('newName')?.trim()
    if (!oldPath?.startsWith(UPLOADS_DIR) || !newName) return { error: 'Invalid rename.' }
    if (!/^[\w\-. ]+\.(webp|jpe?g|jpg|png)$/i.test(newName)) {
      return { error: 'File name can only contain letters, numbers, hyphens, dots.' }
    }
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const oldBase = oldPath.replace(/\.(webp|jpe?g|jpg|png)$/i, '')
    const oldExt = oldPath.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? ''
    const newBase = `${dir}/${newName.replace(/\.(webp|jpe?g|jpg|png)$/i, '')}`
    const newExt = newName.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? oldExt
    // Rename main + responsive variants
    if (existsSync(oldPath)) await rename(oldPath, `${newBase}${newExt}`)
    for (const s of [320, 400, 640, 800]) {
      const v = `${oldBase}-${s}${oldExt}`
      if (existsSync(v)) await rename(v, `${newBase}-${s}${newExt}`)
    }
    // Update products.json references
    const { readFile, writeFile: wf } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const jsonPath = resolve('src/data/products.json')
    const oldUrl = `/uploads/${oldPath.replace(`${UPLOADS_DIR}/`, '')}`
    const newUrl = `/uploads/${newBase.replace(`${UPLOADS_DIR}/`, '')}${newExt}`
    const raw = await readFile(jsonPath, 'utf8')
    if (raw.includes(oldUrl)) {
      await wf(jsonPath, raw.replaceAll(oldUrl, newUrl))
    }
    return { ok: `Renamed to ${newName}.` }
  }

  return { error: 'Unknown action.' }
}

/* ------------------------------------------------------------------ UI -- */

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13V4m0-4-3.5 3.5M10 4l3.5 3.5" />
      <path d="M3 13v2.5A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5V13" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" /><line x1="12.7" y1="12.7" x2="17" y2="17" />
    </svg>
  )
}

function ImageCard({ item, onRename, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(item.name)
  const nav = useNavigation()
  const busy = nav.state !== 'idle'

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={item.path}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          onError={e => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none' }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {editing ? (
          <form onSubmit={e => { e.preventDefault(); onRename(item, newName); setEditing(false) }} className="flex gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-royal-blue focus:outline-none"
            />
            <button type="submit" className="rounded bg-royal-blue px-2 py-1 text-xs text-white hover:bg-royal-blue-dark">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">✕</button>
          </form>
        ) : (
          <p className="truncate font-mono text-[11px] text-gray-500" title={item.name}>{item.name}</p>
        )}

        <div className="flex items-center gap-1.5 mt-auto">
          <button
            type="button"
            onClick={() => { setEditing(true); setNewName(item.name) }}
            disabled={busy}
            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:border-royal-blue hover:text-royal-blue disabled:opacity-40"
          >
            Rename
          </button>
          {confirming ? (
            <>
              <button type="button" onClick={() => onDelete(item)} disabled={busy} className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-40">Confirm</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">✕</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:border-red-500 hover:text-red-600 disabled:opacity-40">Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MediaAdmin() {
  const { items, total, page, totalPages, q } = useLoaderData()
  const actionData = useActionData()
  const nav = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const formRef = useRef(null)
  const busy = nav.state !== 'idle'

  // Auto-submit on file select
  function handleFiles(files) {
    if (!files?.length) return
    const dt = new DataTransfer()
    for (const f of files) dt.items.add(f)
    fileRef.current.files = dt.files
    formRef.current.requestSubmit()
  }

  function handleSearch(e) {
    e.preventDefault()
    const val = e.target.elements.q.value.trim()
    setSearchParams(val ? { q: val } : {})
  }

  function handleRename(item, newName) {
    const fd = new FormData()
    fd.append('intent', 'rename')
    fd.append('oldPath', `${item.dir}/${item.name}`)
    fd.append('newName', newName)
    fetch(window.location.href, { method: 'POST', body: fd })
      .then(() => window.location.reload())
  }

  function handleDelete(item) {
    const fd = new FormData()
    fd.append('intent', 'delete')
    fd.append('path', `${item.dir}/${item.name}`)
    fetch(window.location.href, { method: 'POST', body: fd })
      .then(() => window.location.reload())
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500">{total} image{total !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}</p>
        </div>
        <Form method="post" ref={formRef} encType="multipart/form-data" className="hidden">
          <input type="hidden" name="intent" value="upload" />
          <input ref={fileRef} type="file" name="files" multiple accept="image/*" onChange={e => handleFiles(e.target.files)} />
        </Form>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm text-white transition-colors hover:bg-royal-blue-dark disabled:opacity-50"
        >
          <UploadIcon />
          Upload Images
        </button>
      </div>

      {/* Toast */}
      {actionData?.ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{actionData.ok}</div>
      )}
      {actionData?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionData.error}</div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-royal-blue bg-royal-blue/5' : 'border-gray-300 hover:border-royal-blue/50 hover:bg-gray-50'}`}
      >
        <p className="font-sans text-sm text-gray-500">Drag & drop images here, or <span className="text-royal-blue underline">browse</span></p>
        <p className="mt-1 font-sans text-xs text-gray-400">WebP, JPG, PNG — max 10 MB each</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"><SearchIcon /></span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by filename…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-royal-blue focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50">Search</button>
        {q && (
          <button type="button" onClick={() => setSearchParams({})} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</button>
        )}
      </form>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-gray-500">No images found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {items.map(item => (
            <ImageCard key={item.path} item={item} onRename={handleRename} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-gray-200 pt-6">
          {page > 1 && (
            <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('page', page - 1); return n })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">← Prev</button>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('page', page + 1); return n })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Next →</button>
          )}
        </div>
      )}
    </div>
  )
}
