import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { createProduct, listCategories } from '../../lib/admin-queries.server'
import { log } from '../../lib/activity.server'

export async function loader({ request }) {
  await requireUser(request)
  return { categories: await listCategories() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()

  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'A product name is required.' }

  const id = await createProduct({
    name,
    productCode: String(f.get('productCode') ?? '').trim(),
    status: String(f.get('status') ?? 'draft'),
    categoryId: f.get('categoryId') || null,
  })

  await log(user, 'product.updated', {
    entityType: 'product', entityId: id, entityLabel: name,
    details: { changed: [{ field: 'status', from: '—', to: 'created as draft' }] },
  })

  throw redirect(`/admin/products/${id}`)
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue w-full'

export default function ProductNew() {
  const { categories } = useLoaderData()
  const data = useActionData()
  const nav = useNavigation()
  const saving = nav.state === 'submitting'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/products" className="text-sm text-royal-blue hover:underline">← Products</Link>
      </div>
      <h1 className="font-serif text-2xl font-bold text-tundora">New Product</h1>

      {data?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>
      )}

      <Form method="post">
        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Details</h2>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></span>
            <input name="name" required autoFocus className={field} placeholder="e.g. Colonial Baseboard 3-1/2&quot;" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Product code</span>
              <input name="productCode" className={field} placeholder="e.g. BAS-350" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <select name="status" defaultValue="draft" className={field}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Category</span>
            <select name="categoryId" className={field}>
              <option value="">— Select a category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <p className="text-xs text-gray-400">You can fill in all other details — dimensions, species, images, pricing — after creating the product.</p>
        </section>

        <div className="mt-5 flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create product'}
          </button>
          <Link to="/admin/products" className="text-sm text-gray-600 hover:underline">Cancel</Link>
        </div>
      </Form>
    </div>
  )
}
