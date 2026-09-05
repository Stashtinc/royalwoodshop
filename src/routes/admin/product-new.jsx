import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { createProduct, listCategories } from '../../lib/admin-queries.server'
import { log } from '../../lib/activity.server'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'

export async function loader({ request }) {
  await requireUser(request)
  return { categories: await listCategories() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()

  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'A product name is required.' }

  const avail = String(f.get('availability') ?? '')
  const num = (v) => {
    const t = String(v ?? '').trim()
    return t === '' || Number.isNaN(Number(t)) ? null : t
  }

  const id = await createProduct({
    name,
    productCode: String(f.get('productCode') ?? '').trim(),
    description: String(f.get('description') ?? '').trim(),
    sizeDisplay: String(f.get('sizeDisplay') ?? '').trim(),
    thicknessIn: num(f.get('thicknessIn')),
    widthIn: num(f.get('widthIn')),
    availability: AVAILABILITY.some(([k]) => k === avail) ? avail : null,
    leadTime: String(f.get('leadTime') ?? '').trim(),
    flexAvailable: f.get('flexAvailable') === 'on',
    price: num(f.get('price')),
    salePrice: num(f.get('salePrice')),
    status: ['draft', 'published', 'archived'].includes(String(f.get('status'))) ? String(f.get('status')) : 'draft',
    seoTitle: String(f.get('seoTitle') ?? '').trim(),
    seoDescription: String(f.get('seoDescription') ?? '').trim(),
    categoryId: f.get('categoryId') || null,
  })

  await log(user, 'product.updated', {
    entityType: 'product', entityId: id, entityLabel: name,
    details: { changed: [{ field: 'status', from: '—', to: 'created' }] },
  })

  throw redirect(`/admin/products/${id}`)
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue w-full'
const Label = ({ children, hint }) => (
  <span className="text-sm font-medium text-gray-700">
    {children}{hint && <span className="ml-1.5 font-normal text-gray-400">{hint}</span>}
  </span>
)

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

      <Form method="post" className="flex flex-col gap-6">

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Details</h2>
          <label className="flex flex-col gap-1.5"><Label>Name <span className="text-red-500">*</span></Label>
            <input name="name" required autoFocus className={field} placeholder='e.g. Colonial Baseboard 3-1/2"' /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Product code</Label>
              <input name="productCode" className={field} placeholder="e.g. BAS-350" /></label>
            <label className="flex flex-col gap-1.5"><Label>Status</Label>
              <select name="status" defaultValue="draft" className={field}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select></label>
          </div>
          <label className="flex flex-col gap-1.5"><Label>Category</Label>
            <select name="categoryId" className={field}>
              <option value="">— Select a category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select></label>
          <label className="flex flex-col gap-1.5"><Label>Description</Label>
            <textarea name="description" rows={5} className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Dimensions</h2>
          <label className="flex flex-col gap-1.5"><Label>Size shown to customers</Label>
            <input name="sizeDisplay" className={field} placeholder='e.g. 11/16 x 3-1/2"' /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Thickness</Label>
              <input name="thicknessIn" className={field} inputMode="decimal" placeholder="0.6875" /></label>
            <label className="flex flex-col gap-1.5"><Label>Width</Label>
              <input name="widthIn" className={field} inputMode="decimal" placeholder="3.5" /></label>
          </div>
          <p className="text-xs text-gray-500">Decimal inches. These drive the width filter and sorting, so 5-1/4 is entered as 5.25.</p>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Species</h2>
          <p className="-mt-2 text-xs text-gray-500">Tick every wood this profile is milled in.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SPECIES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="species" value={s} className="h-4 w-4 rounded border-gray-300" />
                {s}
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="flexAvailable" className="h-4 w-4 rounded border-gray-300" />
            Also available as a flexible moulding
          </label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Availability</h2>
          <div className="flex flex-wrap gap-4">
            {[['', 'Not set'], ...AVAILABILITY].map(([k, label]) => (
              <label key={k || 'none'} className="flex items-center gap-2 text-sm">
                <input type="radio" name="availability" value={k} defaultChecked={k === ''} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5"><Label>Lead time</Label>
            <input name="leadTime" placeholder="e.g. approximately 1 week" className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <Label hint="optional">Regular price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input name="price" inputMode="decimal" placeholder="0.00" className={`${field} pl-6`} />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label hint="shows On Sale badge when filled">Sale price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input name="salePrice" inputMode="decimal" placeholder="0.00" className={`${field} pl-6`} />
              </div>
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Search listing</h2>
          <label className="flex flex-col gap-1.5">
            <Label hint="leave blank to generate from the product name">Page title</Label>
            <input name="seoTitle" maxLength={200} className={field} /></label>
          <label className="flex flex-col gap-1.5">
            <Label hint="leave blank to use the description">Meta description</Label>
            <textarea name="seoDescription" rows={2} className={field} /></label>
        </section>

        <div className="flex items-center gap-3">
          <button disabled={saving}
            className="rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60">
            {saving ? 'Creating…' : 'Create product'}
          </button>
          <Link to="/admin/products" className="text-sm text-gray-600 hover:underline">Cancel</Link>
        </div>
      </Form>
    </div>
  )
}
