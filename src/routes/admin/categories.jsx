import { useState } from 'react'
import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import Toast from '../../components/admin/Toast'
import { requireUser } from '../../lib/auth.server'
import {
  listCategoriesAdmin, createCategory, updateCategory,
  deleteCategoryAdmin, moveCategoryOrder,
} from '../../lib/admin-queries.server'
import { log } from '../../lib/activity.server'

export async function loader({ request }) {
  await requireUser(request)
  return { tree: await listCategoriesAdmin() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = String(f.get('intent') ?? '')

  if (intent === 'create') {
    const name = String(f.get('name') ?? '').trim()
    if (!name) return { error: 'Name is required.' }
    const parentId = f.get('parentId') ? Number(f.get('parentId')) : null
    const inNav = f.get('inNav') === 'yes'
    const id = await createCategory({ name, parentId, inNav })
    await log(user, 'category.created', {
      entityType: 'category', entityId: id, entityLabel: name,
    })
    return { saved: `"${name}" created.` }
  }

  if (intent === 'rename') {
    const id = Number(f.get('id'))
    const name = String(f.get('name') ?? '').trim()
    if (!name) return { error: 'Name cannot be blank.' }
    await updateCategory(id, { name })
    await log(user, 'category.updated', { entityType: 'category', entityId: id, entityLabel: name })
    return { saved: 'Renamed.' }
  }

  if (intent === 'toggle-nav') {
    const id = Number(f.get('id'))
    const inNav = f.get('inNav') === 'true'
    await updateCategory(id, { inNav })
    return { saved: inNav ? 'Added to nav.' : 'Removed from nav.' }
  }

  if (intent === 'move') {
    await moveCategoryOrder(Number(f.get('id')), String(f.get('direction')))
    return {}
  }

  if (intent === 'delete') {
    const id = Number(f.get('id'))
    const name = String(f.get('name') ?? '')
    await deleteCategoryAdmin(id)
    await log(user, 'category.deleted', { entityType: 'category', entityLabel: name })
    return { saved: `"${name}" deleted.` }
  }

  return { error: 'Unknown action.' }
}

/* ------------------------------------------------------------------- atoms */


function InlineInput({ defaultValue, onSave, onCancel, placeholder = 'Category name' }) {
  const [val, setVal] = useState(defaultValue ?? '')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(val.trim()) }} className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="flex-1 rounded-lg border border-royal-blue px-2 py-1 text-sm outline-none"
      />
      <button type="submit" disabled={!val.trim()}
        className="rounded-lg bg-royal-blue px-3 py-1 text-xs font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40">
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
    </form>
  )
}

/* --------------------------------------------------------------- sub row */

function SubRow({ sub }) {
  const nav = useNavigation()
  const busy = nav.state !== 'idle'
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs">
      {editing ? (
        <Form method="post" className="flex items-center gap-2" onSubmit={() => setEditing(false)}>
          <input type="hidden" name="intent" value="rename" />
          <input type="hidden" name="id" value={sub.id} />
          <input
            autoFocus
            name="name"
            defaultValue={sub.name}
            className="rounded border border-royal-blue px-1.5 py-0.5 text-xs outline-none w-32"
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <button type="submit" className="text-royal-blue hover:underline">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
        </Form>
      ) : (
        <>
          <span className="text-gray-700">{sub.name}</span>
          {sub.productCount > 0 && (
            <span className="text-gray-400">({sub.productCount})</span>
          )}
          <button type="button" onClick={() => setEditing(true)}
            className="text-gray-400 hover:text-royal-blue ml-1" title="Rename">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3.5 16.5 6.5l-10 10H3.5v-3l10-10Z" />
            </svg>
          </button>
          <Form method="post" onSubmit={(e) => {
            if (!confirm(`Delete "${sub.name}"? Products in this sub-category will be unlinked.`)) e.preventDefault()
          }}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={sub.id} />
            <input type="hidden" name="name" value={sub.name} />
            <button disabled={busy} title="Delete" className="text-gray-300 hover:text-red-500 disabled:opacity-40">
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </Form>
        </>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- category row */

function CategoryRow({ cat, isFirst, isLast }) {
  const nav = useNavigation()
  const busy = nav.state !== 'idle'
  const [editing, setEditing] = useState(false)
  const [addingSub, setAddingSub] = useState(false)
  const [newSubName, setNewSubName] = useState('')

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Reorder */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <Form method="post">
            <input type="hidden" name="intent" value="move" />
            <input type="hidden" name="id" value={cat.id} />
            <input type="hidden" name="direction" value="up" />
            <button disabled={isFirst || busy} title="Move up"
              className="block text-gray-300 hover:text-gray-600 disabled:opacity-20">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l5 5H1z"/></svg>
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="move" />
            <input type="hidden" name="id" value={cat.id} />
            <input type="hidden" name="direction" value="down" />
            <button disabled={isLast || busy} title="Move down"
              className="block text-gray-300 hover:text-gray-600 disabled:opacity-20">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 10L1 5h10z"/></svg>
            </button>
          </Form>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Form method="post" className="flex items-center gap-2" onSubmit={() => setEditing(false)}>
              <input type="hidden" name="intent" value="rename" />
              <input type="hidden" name="id" value={cat.id} />
              <input
                autoFocus
                name="name"
                defaultValue={cat.name}
                className="rounded-lg border border-royal-blue px-2 py-1 text-sm outline-none w-52"
                onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              />
              <button type="submit" className="rounded-lg bg-royal-blue px-3 py-1 text-xs font-medium text-white hover:bg-royal-blue-dark">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500">Cancel</button>
            </Form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium text-tundora text-sm">{cat.name}</span>
              {cat.productCount > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{cat.productCount} products</span>
              )}
            </div>
          )}
        </div>

        {/* In nav toggle */}
        <Form method="post" className="shrink-0">
          <input type="hidden" name="intent" value="toggle-nav" />
          <input type="hidden" name="id" value={cat.id} />
          <input type="hidden" name="inNav" value={cat.inNav ? 'false' : 'true'} />
          <button
            type="submit"
            disabled={busy}
            title={cat.inNav ? 'Remove from top nav' : 'Add to top nav'}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              cat.inNav
                ? 'bg-royal-blue text-white'
                : 'border border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {cat.inNav ? 'In nav' : 'Add to nav'}
          </button>
        </Form>

        {/* Edit / Delete */}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} title="Rename"
            className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3.5 16.5 6.5l-10 10H3.5v-3l10-10Z" />
            </svg>
          </button>
        )}

        <Form method="post" className="shrink-0" onSubmit={(e) => {
          if (!confirm(`Delete "${cat.name}"? Products assigned only to this category will be uncategorised.`)) e.preventDefault()
        }}>
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={cat.id} />
          <input type="hidden" name="name" value={cat.name} />
          <button disabled={busy} title="Delete"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-200 hover:text-red-500 disabled:opacity-40">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 6h12l-1.5 11H5.5L4 6ZM8 6V4h4v2M2 6h16" />
            </svg>
          </button>
        </Form>
      </div>

      {/* Sub-categories */}
      <div className="px-10 pb-3 flex flex-wrap items-center gap-2">
        {cat.subcategories.map((sub) => (
          <SubRow key={sub.id} sub={sub} />
        ))}

        {addingSub ? (
          <Form method="post" className="flex items-center gap-2" onSubmit={() => setAddingSub(false)}>
            <input type="hidden" name="intent" value="create" />
            <input type="hidden" name="parentId" value={cat.id} />
            <input
              autoFocus
              name="name"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="Sub-category name"
              className="rounded-lg border border-royal-blue px-2 py-1 text-xs outline-none w-44"
              onKeyDown={(e) => e.key === 'Escape' && setAddingSub(false)}
            />
            <button disabled={!newSubName.trim()}
              className="rounded-lg bg-royal-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40">
              Add
            </button>
            <button type="button" onClick={() => { setAddingSub(false); setNewSubName('') }}
              className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </Form>
        ) : (
          <button type="button" onClick={() => setAddingSub(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add sub-category
          </button>
        )}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- page */

export default function CategoriesAdmin() {
  const { tree } = useLoaderData()
  const data = useActionData()
  const [addingTop, setAddingTop] = useState(false)
  const [newTopName, setNewTopName] = useState('')
  const [newTopNav, setNewTopNav] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-tundora">Categories</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Changes to categories and nav appear immediately in the admin.
            The public site updates on the next sync&nbsp;&amp;&nbsp;build.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingTop(true)}
          className="flex items-center gap-1.5 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add Category
        </button>
      </div>

      {data?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>
      )}

      {addingTop && (
        <div className="rounded-2xl border border-royal-blue/30 bg-blue-50/40 p-4">
          <Form method="post" className="flex flex-wrap items-end gap-4"
            onSubmit={() => { setAddingTop(false); setNewTopName(''); setNewTopNav(false) }}>
            <input type="hidden" name="intent" value="create" />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Category name</span>
              <input
                autoFocus
                name="name"
                value={newTopName}
                onChange={(e) => setNewTopName(e.target.value)}
                placeholder="e.g. Exterior Cladding"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue w-64"
                onKeyDown={(e) => e.key === 'Escape' && setAddingTop(false)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input
                type="checkbox"
                name="inNav"
                value="yes"
                checked={newTopNav}
                onChange={(e) => setNewTopNav(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-royal-blue"
              />
              Add to top nav
            </label>
            <div className="flex items-center gap-2 pb-2">
              <button
                type="submit"
                disabled={!newTopName.trim()}
                className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40"
              >
                Create
              </button>
              <button type="button" onClick={() => { setAddingTop(false); setNewTopName(''); setNewTopNav(false) }}
                className="text-sm text-gray-600 hover:underline">
                Cancel
              </button>
            </div>
          </Form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {tree.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">No categories yet. Add one above.</p>
        ) : (
          tree.map((cat, i) => (
            <CategoryRow key={cat.id} cat={cat} isFirst={i === 0} isLast={i === tree.length - 1} />
          ))
        )}
      </div>

      <p className="text-xs text-gray-400">
        Deleting a category unlinks its products — they stay in the database as uncategorised. Sub-categories are removed with their parent.
      </p>

      <Toast message={data?.saved} />
    </div>
  )
}
