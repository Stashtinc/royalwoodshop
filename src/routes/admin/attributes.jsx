import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { listAttributes, categoryOptions, createAttribute } from '../../lib/attributes-admin.server.js'
import CatalogueTabs from '../../components/admin/CatalogueTabs'

export async function loader({ request }) {
  await requireUser(request)
  return { attributes: await listAttributes(), categories: await categoryOptions() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'Name is required.' }
  const categoryIds = f.getAll('categoryIds').map(Number)
  try {
    const id = await createAttribute({ name, categoryIds })
    await log(user, 'attribute.created', { entityType: 'attribute', entityId: id, entityLabel: name })
    return { saved: `"${name}" created. Add its values on the attribute's page.` }
  } catch (e) {
    return { error: e.message }
  }
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'

export default function AttributesAdmin() {
  const { attributes, categories } = useLoaderData()
  const data = useActionData()
  const busy = useNavigation().state === 'submitting'

  return (
    <div className="flex flex-col gap-6">
      <CatalogueTabs active="attributes" />
      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Attributes</h1>
        <p className="mt-1 font-sans text-sm text-gray-500">
          Attributes describe products, such as Height or Panel style. Each one applies to the categories you choose.
        </p>
      </div>

      <Form method="post" className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-serif font-bold text-tundora">New attribute</h2>
        <label className="flex max-w-md flex-col gap-1.5">
          <span className="font-sans text-xs font-medium text-gray-600">Name</span>
          <input name="name" placeholder="e.g. Height" className={field} required />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-xs font-medium text-gray-600">Applies to categories</legend>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 font-sans text-sm text-tundora">
                <input type="checkbox" name="categoryIds" value={c.id} className="accent-royal-blue" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-lg bg-royal-blue px-5 py-2 font-sans text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">
            Create attribute
          </button>
          {data?.error && <span className="font-sans text-sm text-red-700">{data.error}</span>}
          {data?.saved && <span className="font-sans text-sm text-green-700">{data.saved}</span>}
        </div>
      </Form>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left font-sans text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Attribute</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Values</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {attributes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No attributes yet.</td></tr>
            )}
            {attributes.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-tundora">{a.name}<span className="ml-2 text-xs text-gray-400">{a.key}</span></td>
                <td className="px-4 py-3 text-gray-600">{a.categories.join(', ') || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{a.values}</td>
                <td className="px-4 py-3 text-gray-600">{a.products}</td>
                <td className="px-4 py-3 text-right">
                  {a.builtin
                    ? <span className="text-xs text-gray-400">From product data</span>
                    : <Link to={`/admin/attributes/${a.id}`} className="text-royal-blue hover:underline">Edit</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
