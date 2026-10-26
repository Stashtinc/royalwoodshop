import { useRef, useState } from 'react'
import { Form, Link, redirect, useActionData, useFetcher, useLoaderData, useNavigation } from 'react-router'
import { ConfirmForm } from '../../components/admin/ConfirmDialog'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import {
  getAttribute, categoryOptions, renameAttribute, setScope, deleteAttribute,
  addValues, renameValue, deleteValue,
} from '../../lib/attributes-admin.server.js'

export async function loader({ request, params }) {
  await requireUser(request)
  const attribute = await getAttribute(params.id)
  if (!attribute) throw new Response('Not found', { status: 404 })
  return { attribute, categories: await categoryOptions() }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = String(f.get('intent') ?? '')
  const id = Number(params.id)
  const label = (await getAttribute(id))?.name ?? 'Attribute'
  try {
    if (intent === 'save-details') {
      const name = String(f.get('name') ?? '').trim()
      if (name) await renameAttribute(id, name)
      await setScope(id, f.getAll('categoryIds').map(Number))
      await log(user, 'attribute.updated', { entityType: 'attribute', entityId: id, entityLabel: name || label })
      return { saved: 'Saved.' }
    }
    if (intent === 'rename') {
      await renameAttribute(id, f.get('name'))
      await log(user, 'attribute.updated', { entityType: 'attribute', entityId: id, entityLabel: label })
      return { saved: 'Renamed.' }
    }
    if (intent === 'scope') {
      await setScope(id, f.getAll('categoryIds').map(Number))
      await log(user, 'attribute.updated', { entityType: 'attribute', entityId: id, entityLabel: label })
      return { saved: 'Categories saved.' }
    }
    if (intent === 'add-values') {
      const { added, skipped } = await addValues(id, f.get('values'))
      await log(user, 'attribute.values_added', { entityType: 'attribute', entityId: id, entityLabel: label, details: { added } })
      const note = skipped.length ? ` Already there: ${skipped.join(', ')}.` : ''
      return { saved: `${added} value${added === 1 ? '' : 's'} added.${note}` }
    }
    if (intent === 'rename-value') {
      await renameValue(f.get('valueId'), f.get('value'))
      return { saved: 'Value renamed.' }
    }
    if (intent === 'delete-value') {
      await deleteValue(f.get('valueId'))
      await log(user, 'attribute.value_deleted', { entityType: 'attribute', entityId: id, entityLabel: label })
      return { saved: 'Value removed. Products keep everything else.' }
    }
    if (intent === 'delete-attribute') {
      await deleteAttribute(id)
      await log(user, 'attribute.deleted', { entityType: 'attribute', entityId: id, entityLabel: label })
      return redirect('/admin/attributes')
    }
  } catch (e) {
    return { error: e.message }
  }
  return { error: 'Unknown action.' }
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'

/** One value, styled like a sub-category chip: name, product count, rename and remove. */
function ValueChip({ value }) {
  const [editing, setEditing] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const fetcher = useFetcher()
  const showTimer = useRef(null)
  const hideTimer = useRef(null)
  function scheduleShow() {
    clearTimeout(hideTimer.current)
    showTimer.current = setTimeout(() => {
      setShowPopover(true)
      if (value.uses > 0 && !fetcher.data) fetcher.load(`/admin/attribute-value-products?id=${value.id}`)
    }, 300)
  }
  function scheduleHide() {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setShowPopover(false), 150)
  }
  if (editing) {
    return (
      <Form method="post" onSubmit={() => setEditing(false)} className="flex items-center gap-1 rounded-lg border border-royal-blue bg-white px-2 py-1">
        <input type="hidden" name="intent" value="rename-value" />
        <input type="hidden" name="valueId" value={value.id} />
        <input name="value" defaultValue={value.value} autoFocus className="w-28 bg-transparent font-sans text-xs text-tundora outline-none" />
        <button type="submit" className="font-sans text-xs font-medium text-royal-blue">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="font-sans text-xs text-gray-400">Cancel</button>
      </Form>
    )
  }
  return (
    <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 font-sans text-xs text-tundora"
      onMouseEnter={scheduleShow}
      onMouseLeave={scheduleHide}>
      {showPopover && value.uses > 0 && (
        <div className="absolute top-full left-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
          onMouseEnter={() => clearTimeout(hideTimer.current)} onMouseLeave={scheduleHide}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{value.value}</p>
          {fetcher.data ? (
            <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {fetcher.data.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`}
                    className="flex items-baseline gap-1 truncate rounded px-1 py-0.5 text-xs text-gray-700 hover:bg-royal-blue/5 hover:text-royal-blue">
                    <span className="truncate">{p.name}</span>
                    {p.productCode && <span className="shrink-0 text-[10px] text-gray-400">{p.productCode}</span>}
                  </Link>
                </li>
              ))}
              {fetcher.data.length === 50 && <li className="text-[10px] text-gray-400 pt-1">+ more…</li>}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">Loading…</p>
          )}
        </div>
      )}
      <span className="font-medium">{value.value}</span>
      <span className="text-gray-400">({value.uses})</span>
      <button type="button" onClick={() => setEditing(true)} title="Rename" className="text-gray-400 hover:text-gray-600">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13.5 3.5 16.5 6.5l-10 10H3.5v-3l10-10Z" />
        </svg>
      </button>
      <ConfirmForm method="post" confirm={{ title: `Remove "${value.value}"?`, message: `${value.uses} product${value.uses === 1 ? '' : 's'} will lose this value. The products themselves stay.`, action: 'Remove' }}>
        <input type="hidden" name="intent" value="delete-value" />
        <input type="hidden" name="valueId" value={value.id} />
        <button type="submit" title="Remove" className="text-gray-300 hover:text-red-700">×</button>
      </ConfirmForm>
    </div>
  )
}

/** "+ Add value": a dashed chip that opens a small input. */
function AddValue() {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 font-sans text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add value
      </button>
    )
  }
  return (
    <Form method="post" onSubmit={() => setOpen(false)} className="flex items-center gap-1 rounded-lg border border-royal-blue bg-white px-2 py-1">
      <input type="hidden" name="intent" value="add-values" />
      <input name="values" placeholder='e.g. 86"' autoFocus className="w-24 bg-transparent font-sans text-xs text-tundora outline-none" />
      <button type="submit" className="font-sans text-xs font-medium text-royal-blue">Add</button>
      <button type="button" onClick={() => setOpen(false)} className="font-sans text-xs text-gray-400">Cancel</button>
    </Form>
  )
}

export default function AttributeEdit() {
  const { attribute, categories } = useLoaderData()
  const data = useActionData()
  const busy = useNavigation().state === 'submitting'
  const [editingName, setEditingName] = useState(false)
  // Save is solid only when the name or the categories differ from what is saved.
  const formRef = useRef(null)
  const [dirty, setDirty] = useState(false)
  function checkDirty() {
    const fd = new FormData(formRef.current)
    const name = String(fd.get('name') ?? '').trim()
    const cats = fd.getAll('categoryIds').map(Number).sort((a, b) => a - b).join()
    const saved = [...attribute.scopeIds].sort((a, b) => a - b).join()
    setDirty(name !== attribute.name || cats !== saved)
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-2 font-sans text-sm text-gray-500">
        <Link to="/admin/attributes" className="hover:text-royal-blue hover:underline">Attributes</Link>
        <span>/</span>
        <span className="text-tundora">{attribute.name}</span>
      </div>

      <Form id="attribute-details" ref={formRef} method="post" onChange={checkDirty} onSubmit={() => setEditingName(false)} className="flex flex-col gap-6">
        <input type="hidden" name="intent" value="save-details" />
        <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Name</h2>
          {editingName ? (
            <input name="name" defaultValue={attribute.name} className={`${field} max-w-md`} required autoFocus />
          ) : (
            <div className="flex items-center gap-3">
              <input type="hidden" name="name" value={attribute.name} />
              <p className="font-sans text-base text-tundora">{attribute.name}</p>
              <button type="button" onClick={() => setEditingName(true)} className="font-sans text-sm text-royal-blue hover:underline">Edit</button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Applies to categories</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 font-sans text-sm text-tundora">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={attribute.scopeIds.includes(c.id)} className="accent-royal-blue" />
                {c.name}
              </label>
            ))}
          </div>
        </section>
      </Form>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-serif font-bold text-tundora">Values</h2>
        <div className="flex flex-wrap items-center gap-2">
          {attribute.values.map((v) => (
            <ValueChip key={v.id} value={v} />
          ))}
          <AddValue />
        </div>
        {attribute.values.length === 0 && <p className="font-sans text-sm text-gray-500">No values yet. Use Add value to start.</p>}
      </div>

      {data?.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {data.error}
        </div>
      )}
      {data?.saved && <p className="font-sans text-sm text-green-700">{data.saved}</p>}

      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:left-60">
        <ConfirmForm method="post" confirm={{ title: `Delete "${attribute.name}"?`, message: 'The attribute and its values are removed. If any product uses it, the delete is refused.', action: 'Delete' }}>
          <input type="hidden" name="intent" value="delete-attribute" />
          <button type="submit" className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:border-red-300 hover:bg-red-50">
            Delete attribute
          </button>
        </ConfirmForm>
        <div className="flex items-center gap-3">
          <button type="submit" form="attribute-details" disabled={busy}
            className={`rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              dirty
                ? 'border-royal-blue bg-royal-blue text-white hover:bg-royal-blue-dark'
                : 'border-royal-blue bg-white text-royal-blue hover:bg-royal-blue/5'
            }`}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/admin/attributes" className="text-sm text-gray-600 hover:underline">Cancel</Link>
        </div>
      </div>
    </div>
  )
}
