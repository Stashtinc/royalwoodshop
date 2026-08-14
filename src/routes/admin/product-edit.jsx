import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getProduct, saveProduct } from '../../lib/admin-queries.server'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'

export async function loader({ request, params }) {
  await requireUser(request)
  const product = await getProduct(params.id)
  if (!product) throw new Response('Not found', { status: 404 })
  return { product }
}

export async function action({ request, params }) {
  await requireUser(request)
  const f = await request.formData()

  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'A product needs a name.' }

  const avail = String(f.get('availability') ?? '')
  const num = (v) => {
    const t = String(v ?? '').trim()
    return t === '' || Number.isNaN(Number(t)) ? null : t
  }

  await saveProduct(params.id, {
    name,
    productCode: String(f.get('productCode') ?? '').trim(),
    description: String(f.get('description') ?? '').trim(),
    sizeDisplay: String(f.get('sizeDisplay') ?? '').trim(),
    thicknessIn: num(f.get('thicknessIn')),
    widthIn: num(f.get('widthIn')),
    availability: AVAILABILITY.some(([k]) => k === avail) ? avail : null,
    leadTime: String(f.get('leadTime') ?? '').trim(),
    flexAvailable: f.get('flexAvailable') === 'on',
    status: ['draft', 'published', 'archived'].includes(String(f.get('status'))) ? String(f.get('status')) : 'draft',
    seoTitle: String(f.get('seoTitle') ?? '').trim(),
    seoDescription: String(f.get('seoDescription') ?? '').trim(),
    species: f.getAll('species').map(String),
  })

  return { saved: true }
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'
const Label = ({ children, hint }) => (
  <span className="text-sm font-medium text-gray-700">
    {children}{hint && <span className="ml-1.5 font-normal text-gray-400">{hint}</span>}
  </span>
)

export default function ProductEdit() {
  const { product } = useLoaderData()
  const data = useActionData()
  const nav = useNavigation()
  const saving = nav.state === 'submitting'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <Link to="/admin/products" className="text-sm text-royal-blue hover:underline">← Products</Link>
        <span className="font-mono text-xs text-gray-500">{product.productCode}</span>
      </div>
      <h1 className="font-serif text-2xl font-bold text-tundora">{product.name}</h1>

      {data?.saved && <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">Saved.</p>}
      {data?.error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>}

      <Form method="post" className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Details</h2>
          <label className="flex flex-col gap-1.5"><Label>Name</Label>
            <input name="name" defaultValue={product.name} className={field} required /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Product code</Label>
              <input name="productCode" defaultValue={product.productCode ?? ''} className={field} /></label>
            <label className="flex flex-col gap-1.5"><Label>Status</Label>
              <select name="status" defaultValue={product.status} className={field}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select></label>
          </div>
          <label className="flex flex-col gap-1.5"><Label>Description</Label>
            <textarea name="description" rows={5} defaultValue={product.description ?? ''} className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Dimensions</h2>
          <label className="flex flex-col gap-1.5"><Label>Size shown to customers</Label>
            <input name="sizeDisplay" defaultValue={product.sizeDisplay ?? ''} className={field} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Thickness</Label>
              <input name="thicknessIn" defaultValue={product.thicknessIn ?? ''} className={field} inputMode="decimal" /></label>
            <label className="flex flex-col gap-1.5"><Label>Width</Label>
              <input name="widthIn" defaultValue={product.widthIn ?? ''} className={field} inputMode="decimal" /></label>
          </div>
          <p className="text-xs text-gray-500">
            Decimal inches. These drive the width filter and sorting, so 5-1/4 is entered as 5.25.
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Species</h2>
          <p className="-mt-2 text-xs text-gray-500">Tick every wood this profile is milled in.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SPECIES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="species" value={s} defaultChecked={product.species.includes(s)}
                  className="h-4 w-4 rounded border-gray-300" />
                {s}
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="flexAvailable" defaultChecked={product.flexAvailable}
              className="h-4 w-4 rounded border-gray-300" />
            Also available as a flexible moulding
          </label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Availability</h2>
          <div className="flex flex-wrap gap-4">
            {[['', 'Not set'], ...AVAILABILITY].map(([k, label]) => (
              <label key={k || 'none'} className="flex items-center gap-2 text-sm">
                <input type="radio" name="availability" value={k}
                  defaultChecked={(product.availability ?? '') === k} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5"><Label>Lead time</Label>
            <input name="leadTime" defaultValue={product.leadTime ?? ''} placeholder="e.g. approximately 1 week" className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Search listing</h2>
          <label className="flex flex-col gap-1.5">
            <Label hint="leave blank to generate from the product name">Page title</Label>
            <input name="seoTitle" defaultValue={product.seoTitle ?? ''} maxLength={200} className={field} /></label>
          <label className="flex flex-col gap-1.5">
            <Label hint="leave blank to use the description">Meta description</Label>
            <textarea name="seoDescription" rows={2} defaultValue={product.seoDescription ?? ''} className={field} /></label>
        </section>

        <div className="flex items-center gap-3">
          <button disabled={saving}
            className="rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/admin/products" className="text-sm text-gray-600 hover:underline">Cancel</Link>
        </div>
      </Form>
    </div>
  )
}
