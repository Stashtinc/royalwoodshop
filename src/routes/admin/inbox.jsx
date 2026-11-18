import { useEffect, useRef, useState } from 'react'
import { Form, Link, useActionData, useLoaderData, useNavigate, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listInbox, deleteInboxItems } from '../../lib/inbox.server.js'
import { log } from '../../lib/activity.server.js'
import StatusBadge from '../../components/admin/StatusBadge'

export async function loader({ request }) {
  await requireUser(request)
  return { rows: await listInbox() }
}

/** Bulk delete. Each checked row arrives as "kind:id". Only ever removes what was ticked. */
export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const selected = f.getAll('item').map((v) => {
    const [kind, id] = String(v).split(':')
    return { kind, id: Number(id) }
  }).filter((s) => (s.kind === 'enquiry' || s.kind === 'quote') && Number.isInteger(s.id))
  if (!selected.length) return { error: 'Nothing was selected.' }

  const removed = await deleteInboxItems(selected)
  await log(user, 'inbox.delete', {
    entityType: 'inbox',
    details: { removed, requested: selected.length },
  })
  return { removed }
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function Inbox() {
  const { rows } = useLoaderData()
  const result = useActionData()
  const nav = useNavigation()
  const navigate = useNavigate()
  const busy = nav.state !== 'idle'
  const [picked, setPicked] = useState(() => new Set())
  const [filter, setFilter] = useState('All')
  const selectAll = useRef(null)

  // The kinds of entry present, in the order they first appear, for the filter buttons.
  const types = [...new Set(rows.map((r) => r.type))]
  const visible = filter === 'All' ? rows : rows.filter((r) => r.type === filter)

  const keyOf = (r) => `${r.kind}:${r.id}`
  const allPicked = visible.length > 0 && visible.every((r) => picked.has(keyOf(r)))
  const somePicked = picked.size > 0 && !allPicked

  // Keep the select-all box in its "some selected" state.
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = somePicked
  }, [somePicked])

  // Forget selections that are no longer in the list, e.g. after a delete.
  useEffect(() => {
    setPicked((prev) => new Set([...prev].filter((k) => rows.some((r) => keyOf(r) === k))))
  }, [rows])

  const toggle = (key) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  // Select-all applies to the rows currently shown, so a filtered view deletes only what you can see.
  const toggleAll = () => setPicked((prev) => {
    const next = new Set(prev)
    if (allPicked) visible.forEach((r) => next.delete(keyOf(r)))
    else visible.forEach((r) => next.add(keyOf(r)))
    return next
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Inbox</h1>
        <p className="mt-1 font-sans text-sm text-gray-500">
          Website enquiries and quote requests, newest first. Each one was saved before its email was sent.
          If it says <strong>Failed</strong> or <strong>Not emailed</strong>, follow up by phone or email.
        </p>
      </div>

      {result?.removed !== undefined && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 font-sans text-sm text-green-700">
          Deleted {result.removed} {result.removed === 1 ? 'entry' : 'entries'}.
        </p>
      )}
      {result?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700">{result.error}</p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-10 text-center font-sans text-gray-500">
          No enquiries yet.
        </p>
      ) : (
        <Form
          method="post"
          onSubmit={(e) => {
            const n = picked.size
            const ok = window.confirm(
              `Permanently delete ${n} ${n === 1 ? 'entry' : 'entries'}? Quote attachments are deleted too. This cannot be undone.`,
            )
            if (!ok) e.preventDefault()
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap gap-2">
            {['All', ...types].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-full px-3 py-1.5 font-sans text-sm transition-colors ${
                  filter === t ? 'bg-royal-blue text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {t}
                <span className="ml-1.5 opacity-70">
                  {t === 'All' ? rows.length : rows.filter((r) => r.type === t).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 font-sans text-sm text-gray-700">
              <input
                ref={selectAll}
                type="checkbox"
                checked={allPicked}
                onChange={toggleAll}
                className="h-4 w-4 accent-royal-blue"
                aria-label="Select all"
              />
              {picked.size > 0 ? `${picked.size} selected` : 'Select all'}
            </label>
            {picked.size > 0 && (
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 font-sans text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Deleting…' : `Delete selected (${picked.size})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[720px] text-left font-sans text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const key = keyOf(r)
                  return (
                    <tr
                      key={key}
                      onClick={(e) => {
                        // Clicking the checkbox, or a link or button in the row, keeps its own action.
                        if (e.target.closest('input, a, button')) return
                        navigate(`/admin/inbox/${r.kind}/${r.id}`)
                      }}
                      className={`cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${r.unread ? 'bg-yellow-100 font-semibold hover:bg-yellow-200' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          name="item"
                          value={key}
                          checked={picked.has(key)}
                          onChange={() => toggle(key)}
                          className="h-4 w-4 accent-royal-blue"
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        <Link to={`/admin/inbox/${r.kind}/${r.id}`} className="hover:text-royal-blue">
                          {dateFormat.format(new Date(r.createdAt))}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.type}</td>
                      <td className="px-4 py-3 font-medium text-tundora">
                        <Link to={`/admin/inbox/${r.kind}/${r.id}`} className="hover:text-royal-blue">{r.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Form>
      )}
    </div>
  )
}
