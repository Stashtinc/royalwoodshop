import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
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

export default function AttributeEdit() {
  const { attribute, categories } = useLoaderData()
  const data = useActionData()
  const busy = useNavigation().state === 'submitting'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 font-sans text-sm text-gray-500">
        <Link to="/admin/attributes" className="hover:text-royal-blue hover:underline">Attributes</Link>
        <span>/</span>
        <span className="text-tundora">{attribute.name}</span>
      </div>

      <Form method="post" className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-5">
        <input type="hidden" name="intent" value="rename" />
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-xs font-medium text-gray-600">Name</span>
          <input name="name" defaultValue={attribute.name} className={field} required />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg border border-royal-blue px-4 py-2 font-sans text-sm font-medium text-royal-blue hover:bg-royal-blue hover:text-white disabled:opacity-50">Save name</button>
      </Form>

      <Form method="post" className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <input type="hidden" name="intent" value="scope" />
        <h2 className="font-serif font-bold text-tundora">Applies to categories</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 font-sans text-sm text-tundora">
              <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={attribute.scopeIds.includes(c.id)} className="accent-royal-blue" />
              {c.name}
            </label>
          ))}
        </div>
        <div><button type="submit" disabled={busy} className="rounded-lg bg-royal-blue px-5 py-2 font-sans text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">Save categories</button></div>
      </Form>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-serif font-bold text-tundora">Values</h2>
        <Form method="post" className="flex flex-col gap-2">
          <input type="hidden" name="intent" value="add-values" />
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-medium text-gray-600">Add values — one per line</span>
            <textarea name="values" rows={4} placeholder={'78"\n80"\n84"'} className={field} />
          </label>
          <div><button type="submit" disabled={busy} className="rounded-lg bg-royal-blue px-5 py-2 font-sans text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">Add values</button></div>
        </Form>

        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {attribute.values.length === 0 && <li className="px-4 py-6 text-center font-sans text-sm text-gray-500">No values yet.</li>}
          {attribute.values.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Form method="post" className="flex flex-1 items-center gap-2">
                <input type="hidden" name="intent" value="rename-value" />
                <input type="hidden" name="valueId" value={v.id} />
                <input name="value" defaultValue={v.value} className={`${field} flex-1`} />
                <button type="submit" className="font-sans text-sm text-royal-blue hover:underline">Save</button>
              </Form>
              <span className="font-sans text-xs text-gray-500">{v.uses} product{v.uses === 1 ? '' : 's'}</span>
              <ConfirmForm method="post" confirm={{ title: `Remove "${v.value}"?`, message: `${v.uses} product${v.uses === 1 ? '' : 's'} will lose this value. The products themselves stay.`, action: 'Remove' }}>
                <input type="hidden" name="intent" value="delete-value" />
                <input type="hidden" name="valueId" value={v.id} />
                <button type="submit" className="font-sans text-sm text-red-700 hover:underline">Remove</button>
              </ConfirmForm>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-5">
        <h2 className="font-serif font-bold text-tundora">Delete attribute</h2>
        {attribute.productCount > 0 ? (
          <p className="font-sans text-sm text-gray-500">
            {attribute.name} is used by {attribute.productCount} product{attribute.productCount === 1 ? '' : 's'}, so it can't be deleted until they are removed.
          </p>
        ) : (
          <ConfirmForm method="post" confirm={{ title: `Delete "${attribute.name}"?`, message: 'The attribute and its values are removed. No products use it.', action: 'Delete' }}>
            <input type="hidden" name="intent" value="delete-attribute" />
            <button type="submit" className="rounded-lg border border-red-300 px-4 py-2 font-sans text-sm text-red-700 hover:bg-red-50">Delete attribute</button>
          </ConfirmForm>
        )}
      </div>

      {data?.error && <p className="font-sans text-sm text-red-700">{data.error}</p>}
      {data?.saved && <p className="font-sans text-sm text-green-700">{data.saved}</p>}
    </div>
  )
}
