import { useEffect, useRef, useState } from 'react'
import { Form, useLoaderData, useActionData, useNavigation, useSearchParams, useFetcher } from 'react-router'
import { requireUser } from '../../lib/auth.server'

const UPLOADS_DIR = 'public/uploads'
const PAGE_SIZE = 60
const VARIANT_RE = /-(320|400|640|800)\.(webp|jpe?g|png)$/i

/* ---------------------------------------------------------------- loader -- */

export async function loader({ request }) {
  await requireUser(request)
  const { readdir, stat } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.toLowerCase() ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const detailFile = url.searchParams.get('detail') ?? null

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

  // Detail mode — rich info about a single file
  if (detailFile) {
    const item = allFiles.find(f => f.name === detailFile)
    if (!item) return { detail: null }
    const fullPath = `${item.dir}/${item.name}`
    const s = await stat(fullPath)
    const ext = item.name.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? ''
    const base = fullPath.replace(ext, '')
    const variants = [320, 400, 640, 800].filter(size => existsSync(`${base}-${size}${ext}`))
    const { readFile } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    let usedIn = []
    try {
      const raw = await readFile(resolve('src/data/products.json'), 'utf8')
      usedIn = JSON.parse(raw)
        .filter(p => p.image?.includes(item.name.replace(ext, '')))
        .map(p => ({ name: p.name, slug: p.slug, category: p.category }))
        .slice(0, 10)
    } catch {}
    return { detail: { ...item, size: s.size, mtime: s.mtime.toISOString(), variants, usedIn } }
  }

  const filtered = q ? allFiles.filter(f => f.name.toLowerCase().includes(q)) : allFiles
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return { items, total: filtered.length, page, totalPages, q }
}

/* ---------------------------------------------------------------- action -- */

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
      await writeFile(`${UPLOADS_DIR}/${file.name}`, Buffer.from(await file.arrayBuffer()))
      saved.push(file.name)
    }
    return { ok: `Uploaded ${saved.length} file${saved.length !== 1 ? 's' : ''}.` }
  }

  if (intent === 'delete') {
    const filePath = form.get('path')
    if (!filePath?.startsWith(UPLOADS_DIR)) return { error: 'Invalid path.' }
    const base = filePath.replace(/\.(webp|jpe?g|jpg|png)$/i, '')
    const ext = filePath.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? ''
    for (const p of [filePath, ...[320, 400, 640, 800].map(s => `${base}-${s}${ext}`)]) {
      try { if (existsSync(p)) await unlink(p) } catch {}
    }
    return { ok: 'Deleted.' }
  }

  if (intent === 'rename') {
    const oldPath = form.get('oldPath')
    const newName = form.get('newName')?.trim()
    if (!oldPath?.startsWith(UPLOADS_DIR) || !newName) return { error: 'Invalid rename.' }
    if (!/^[\w\-.]+\.(webp|jpe?g|jpg|png)$/i.test(newName)) {
      return { error: 'Name may only contain letters, numbers, hyphens, and dots.' }
    }
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const oldBase = oldPath.replace(/\.(webp|jpe?g|jpg|png)$/i, '')
    const oldExt = oldPath.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? ''
    const newBase = `${dir}/${newName.replace(/\.(webp|jpe?g|jpg|png)$/i, '')}`
    const newExt = newName.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0] ?? oldExt
    if (existsSync(oldPath)) await rename(oldPath, `${newBase}${newExt}`)
    for (const s of [320, 400, 640, 800]) {
      const v = `${oldBase}-${s}${oldExt}`
      if (existsSync(v)) await rename(v, `${newBase}-${s}${newExt}`)
    }
    const { readFile, writeFile: wf } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const jsonPath = resolve('src/data/products.json')
    const oldUrl = `/uploads/${oldPath.replace(`${UPLOADS_DIR}/`, '')}`
    const newUrl = `/uploads/${newBase.replace(`${UPLOADS_DIR}/`, '')}${newExt}`
    const raw = await readFile(jsonPath, 'utf8')
    if (raw.includes(oldUrl)) await wf(jsonPath, raw.replaceAll(oldUrl, newUrl))
    return { ok: `Renamed to ${newName}.` }
  }

  if (intent === 'alt') {
    const { readFile, writeFile: wf } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const altPath = resolve('src/data/mediaAlt.json')
    let alts = {}
    try { alts = JSON.parse(await readFile(altPath, 'utf8')) } catch {}
    const filename = form.get('filename')
    const altText = form.get('altText')?.trim()
    if (altText) alts[filename] = altText
    else delete alts[filename]
    await wf(altPath, JSON.stringify(alts, null, 2))
    return { ok: 'Alt text saved.' }
  }

  return { error: 'Unknown action.' }
}

/* ----------------------------------------------------------------- icons -- */

const svgProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

const UploadIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" {...svgProps}><path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5"/><path d="M3 13v2.5A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><line x1="12.7" y1="12.7" x2="17" y2="17"/></svg>
const CloseIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" {...svgProps}><path d="M4 4l12 12M16 4L4 16"/></svg>
const CopyIcon = () => <svg width="13" height="13" viewBox="0 0 20 20" {...svgProps}><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/></svg>
const Spinner = () => <svg className="h-5 w-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20"/></svg>

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

/* --------------------------------------------------------------- detail panel -- */

function DetailPanel({ item, onClose }) {
  const detailFetcher = useFetcher()
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(item.name)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dims, setDims] = useState(null)
  const [altSaved, setAltSaved] = useState(false)

  useEffect(() => {
    setRenaming(false)
    setConfirming(false)
    setDims(null)
    setAltSaved(false)
    detailFetcher.load(`/admin/media?detail=${encodeURIComponent(item.name)}`)
  }, [item.name])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = item.path
  }, [item.path])

  const detail = detailFetcher.data?.detail
  const ext = item.name.match(/\.(webp|jpe?g|jpg|png)$/i)?.[0]?.slice(1).toUpperCase() ?? 'IMG'

  function copy() {
    navigator.clipboard.writeText(item.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function doRename(e) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('intent', 'rename')
    fd.append('oldPath', `${item.dir}/${item.name}`)
    fd.append('newName', newName)
    fetch(window.location.pathname, { method: 'POST', body: fd })
      .then(() => window.location.reload())
  }

  function doDelete() {
    const fd = new FormData()
    fd.append('intent', 'delete')
    fd.append('path', `${item.dir}/${item.name}`)
    fetch(window.location.pathname, { method: 'POST', body: fd })
      .then(() => window.location.reload())
  }

  function saveAlt(e) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('intent', 'alt')
    fd.append('filename', item.name)
    fetch(window.location.pathname, { method: 'POST', body: fd })
      .then(() => { setAltSaved(true); setTimeout(() => setAltSaved(false), 2000) })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900" title={item.name}>{item.name}</h2>
        <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><CloseIcon /></button>
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center bg-gray-50 p-5 border-b border-gray-100" style={{ minHeight: 180 }}>
        <img src={item.path} alt={item.name} className="max-h-44 max-w-full rounded object-contain shadow-sm" onError={e => { e.currentTarget.style.display = 'none' }} />
      </div>

      <div className="flex flex-col gap-5 p-4">

        {/* URL */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-[11px] text-gray-500">{item.path}</code>
          <button onClick={copy} className="shrink-0 text-gray-400 hover:text-royal-blue" title="Copy URL">
            {copied ? <span className="text-[11px] font-medium text-green-600">Copied!</span> : <CopyIcon />}
          </button>
        </div>

        {/* Metadata */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">File info</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {[
              ['Format', ext],
              ['Size', detail ? fmt(detail.size) : '…'],
              ['Dimensions', dims ? `${dims.w} × ${dims.h}` : '…'],
              ['Variants', detail ? (detail.variants.length ? detail.variants.map(v => `${v}w`).join(', ') : 'None') : '…'],
              ['Modified', detail ? new Date(detail.mtime).toLocaleDateString('en-CA') : '…'],
            ].map(([k, v]) => (
              <>
                <dt key={k} className="text-gray-400">{k}</dt>
                <dd key={k + '_v'} className="font-medium text-gray-700">{v}</dd>
              </>
            ))}
          </dl>
        </section>

        {/* Accessibility */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Accessibility</p>
          <form onSubmit={saveAlt} className="flex flex-col gap-2">
            <textarea
              name="altText"
              rows={2}
              placeholder="Describe this image for screen readers…"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-royal-blue focus:outline-none"
            />
            <button type="submit" className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-royal-blue hover:text-royal-blue">
              {altSaved ? '✓ Saved' : 'Save alt text'}
            </button>
          </form>

          {detail?.usedIn?.length > 0 && (
            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Used by {detail.usedIn.length} product{detail.usedIn.length !== 1 ? 's' : ''}</p>
              <ul className="space-y-1">
                {detail.usedIn.map(p => (
                  <li key={p.slug} className="flex items-center gap-1">
                    <a href={`/admin/products/${p.slug}`} className="text-xs text-royal-blue hover:underline truncate">{p.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detail?.usedIn?.length === 0 && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Not used by any product</p>
          )}
        </section>

        {/* Edit */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Edit</p>
          <div className="flex flex-col gap-2">
            {renaming ? (
              <form onSubmit={doRename} className="flex gap-1.5">
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-royal-blue focus:outline-none" />
                <button type="submit" className="rounded-lg bg-royal-blue px-2.5 py-1.5 text-xs text-white hover:bg-royal-blue-dark">Save</button>
                <button type="button" onClick={() => setRenaming(false)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">✕</button>
              </form>
            ) : (
              <button onClick={() => { setRenaming(true); setNewName(item.name) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:border-royal-blue hover:text-royal-blue transition-colors">
                Rename file…
              </button>
            )}
            {confirming ? (
              <div className="flex gap-2">
                <button onClick={doDelete} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700">Confirm delete</button>
                <button onClick={() => setConfirming(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)}
                className="rounded-lg border border-red-100 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                Delete file…
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}

/* -------------------------------------------------------------- image card -- */

function ImageCard({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition-all hover:shadow-md focus-visible:outline-none ${
        selected ? 'border-royal-blue ring-2 ring-royal-blue/20 shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={item.path}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate font-mono text-[10px] text-gray-400" title={item.name}>{item.name}</p>
      </div>
    </button>
  )
}

/* ----------------------------------------------------------------- page -- */

export default function MediaAdmin() {
  const loaderData = useLoaderData()
  const actionData = useActionData()
  const nav = useNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState(loaderData.items ?? [])
  const [hasMore, setHasMore] = useState((loaderData.page ?? 1) < (loaderData.totalPages ?? 1))
  const [nextPage, setNextPage] = useState((loaderData.page ?? 1) + 1)
  const fileRef = useRef(null)
  const formRef = useRef(null)
  const sentinelRef = useRef(null)
  const scrollFetcher = useFetcher()
  const busy = nav.state !== 'idle'
  const q = loaderData.q ?? ''

  // Reset when search changes
  useEffect(() => {
    setItems(loaderData.items ?? [])
    setHasMore((loaderData.page ?? 1) < (loaderData.totalPages ?? 1))
    setNextPage((loaderData.page ?? 1) + 1)
    setSelected(null)
  }, [loaderData])

  // Append pages from infinite scroll
  useEffect(() => {
    if (!scrollFetcher.data?.items || scrollFetcher.state !== 'idle') return
    setItems(prev => [...prev, ...scrollFetcher.data.items])
    setHasMore(scrollFetcher.data.page < scrollFetcher.data.totalPages)
    setNextPage(scrollFetcher.data.page + 1)
  }, [scrollFetcher.data, scrollFetcher.state])

  // IntersectionObserver sentinel
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && scrollFetcher.state === 'idle') {
          const params = new URLSearchParams()
          params.set('page', nextPage)
          if (q) params.set('q', q)
          scrollFetcher.load(`/admin/media?${params}`)
        }
      },
      { rootMargin: '300px' }
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, nextPage, q, scrollFetcher.state])

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

  const { total } = loaderData

  return (
    <div className="flex gap-6">

      {/* ---- Main column ---- */}
      <div className="min-w-0 flex-1 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
            <p className="text-sm text-gray-500">{total} image{total !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}</p>
          </div>
          <Form method="post" ref={formRef} encType="multipart/form-data" className="hidden">
            <input type="hidden" name="intent" value="upload" />
            <input ref={fileRef} type="file" name="files" multiple accept="image/*" onChange={e => handleFiles(e.target.files)} />
          </Form>
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm text-white hover:bg-royal-blue-dark disabled:opacity-50">
            <UploadIcon /> Upload
          </button>
        </div>

        {actionData?.ok && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">{actionData.ok}</div>}
        {actionData?.error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{actionData.error}</div>}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-4 text-center transition-colors ${
            dragging ? 'border-royal-blue bg-royal-blue/5' : 'border-gray-300 hover:border-royal-blue/40 hover:bg-gray-50'
          }`}
        >
          <p className="text-sm text-gray-500">Drag & drop images, or <span className="text-royal-blue underline">browse</span></p>
          <p className="mt-0.5 text-xs text-gray-400">WebP, JPG, PNG — max 10 MB each</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"><SearchIcon /></span>
            <input name="q" defaultValue={q} key={q} placeholder="Search by filename…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-royal-blue focus:outline-none" />
          </div>
          <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Search</button>
          {q && <button type="button" onClick={() => setSearchParams({})} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">✕</button>}
        </form>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">No images found.</div>
        ) : (
          <div className={`grid gap-3 ${selected ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'}`}>
            {items.map(item => (
              <ImageCard
                key={item.path}
                item={item}
                selected={selected?.path === item.path}
                onSelect={i => setSelected(prev => prev?.path === i.path ? null : i)}
              />
            ))}
          </div>
        )}

        {/* Sentinel */}
        <div ref={sentinelRef} className="flex justify-center py-4">
          {scrollFetcher.state !== 'idle' && <Spinner />}
          {!hasMore && items.length > 0 && (
            <p className="text-xs text-gray-400">{items.length} of {total} images</p>
          )}
        </div>
      </div>

      {/* ---- Detail panel ---- */}
      {selected && (
        <aside className="w-72 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
            <DetailPanel item={selected} onClose={() => setSelected(null)} />
          </div>
        </aside>
      )}

    </div>
  )
}
