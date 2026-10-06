import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'

/** Picks existing images from the Media library and attaches them to the product. */
export default function MediaPicker() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState([])
  const list = useFetcher()
  const attach = useFetcher()

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => list.load(`/admin/media?q=${encodeURIComponent(q)}&page=${page}`), 250)
    return () => clearTimeout(t)
  }, [open, q, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (attach.state === 'idle' && attach.data?.saved) { setOpen(false); setPicked([]) }
  }, [attach.state, attach.data])

  const toggle = (path) => setPicked((p) => (p.includes(path) ? p.filter((x) => x !== path) : [...p, path]))
  const data = list.data
  const busy = attach.state !== 'idle'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
      >
        Choose from Media library
      </button>

      {open && (
        <div data-media-picker className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3 rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg font-bold text-tundora">Media library</h3>
              <input
                autoFocus
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Search file names…"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue"
              />
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
            </div>

            <div className="min-h-[200px] flex-1 overflow-y-auto">
              {!data ? (
                <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
              ) : data.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No images match.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {data.items.map((item) => {
                    const on = picked.includes(item.path)
                    return (
                      <li key={item.path}>
                        <button
                          type="button"
                          onClick={() => toggle(item.path)}
                          className={`flex w-full flex-col overflow-hidden rounded-lg border-2 text-left ${on ? 'border-royal-blue' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <img src={item.path} alt="" loading="lazy" className="aspect-square w-full bg-gray-50 object-contain" />
                          <span className="truncate px-1.5 py-1 text-[11px] text-gray-600">{item.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {data && data.totalPages > 1 && (
                  <>
                    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-2 py-1 disabled:opacity-40">‹</button>
                    <span>Page {data.page} of {data.totalPages} · {data.total} images</span>
                    <button type="button" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="rounded border px-2 py-1 disabled:opacity-40">›</button>
                  </>
                )}
              </div>
              {attach.data?.error && <p className="text-xs text-red-700">{attach.data.error}</p>}
              <attach.Form method="post">
                <input type="hidden" name="intent" value="attach-media" />
                {picked.map((p) => <input key={p} type="hidden" name="path" value={p} />)}
                <button
                  disabled={!picked.length || busy}
                  className="rounded-lg bg-royal-blue px-5 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40"
                >
                  {busy ? 'Adding…' : `Add ${picked.length || ''} image${picked.length === 1 ? '' : 's'}`}
                </button>
              </attach.Form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
