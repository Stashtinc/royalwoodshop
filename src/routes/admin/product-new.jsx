import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { createProduct, listCategoriesWithSubs, saveProductPartIds, partIdsInUse, productWithCode } from '../../lib/admin-queries.server'
import { syncProductsJson } from '../../lib/sync.server'
import { log } from '../../lib/activity.server'
import { AVAILABILITY } from '../../lib/catalogue-constants'
import CategoryPicker from '../../components/admin/CategoryPicker'
import SpeciesPicker, { readSpeciesAvail, readPartEntries } from '../../components/admin/SpeciesPicker'
import UomSelect from '../../components/admin/UomSelect'
import { normaliseUom } from '../../lib/catalogue-constants'
import SeoFields from '../../components/admin/SeoFields'
import ImageDropZone from '../../components/admin/ImageDropZone'
import MediaPicker from '../../components/admin/MediaPicker'
import { saveUpload, describeLimits } from '../../lib/uploads.server'

export async function loader({ request }) {
  await requireUser(request)
  return { categoryTree: await listCategoriesWithSubs() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()

  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'A product name is required.' }
  const sameCode = await productWithCode(f.get('productCode'), null)
  if (sameCode) {
    return { error: `Product code ${String(f.get('productCode')).trim()} is already used by "${sameCode.name}"${sameCode.status === 'archived' ? ' (archived)' : ''}. Each product needs its own code, e.g. ${String(f.get('productCode')).trim()}-MDF.` }
  }

  const num = (v) => {
    const t = String(v ?? '').trim()
    return t === '' || Number.isNaN(Number(t)) ? null : t
  }

  const { species, speciesAvail, flexAvailability } = readSpeciesAvail(f)

  // Checked before the product is created, so a bad value cannot leave a half-made product.
  const { entries: partEntries, error: partError } = readPartEntries(f)
  if (partError) return { error: partError }
  const taken = await partIdsInUse(Object.values(partEntries).map((e) => e.partId))
  if (taken.length) return { error: `Already used on another product: ${taken.join(', ')}` }

  const files = f.getAll('images').filter((x) => typeof x !== 'string' && x.size > 0)
  const { maxMb } = describeLimits()
  const badFile = files.find((x) => !/^image\/(jpeg|png|webp|avif)$/.test(x.type) || x.size > maxMb * 1024 * 1024)
  if (badFile) return { error: `${badFile.name}: only JPG, PNG, WebP or AVIF up to ${maxMb} MB.` }

  const id = await createProduct({
    name,
    productCode: String(f.get('productCode') ?? '').trim(),
    description: String(f.get('description') ?? '').trim(),
    sizeDisplay: String(f.get('sizeDisplay') ?? '').trim(),
    thicknessIn: num(f.get('thicknessIn')),
    widthIn: num(f.get('widthIn')),
    availability: null,  // derived from species in createProduct
    leadTime: String(f.get('leadTime') ?? '').trim(),
    uom: normaliseUom(f.get('uom')),
    flexAvailability,
    price: num(f.get('price')),
    salePrice: num(f.get('salePrice')),
    status: ['draft', 'published', 'archived'].includes(String(f.get('status'))) ? String(f.get('status')) : 'draft',
    seoTitle: String(f.get('seoTitle') ?? '').trim(),
    seoDescription: String(f.get('seoDescription') ?? '').trim(),
    primaryCategoryId: f.get('primaryCategoryId') || null,
    categoryIds: f.getAll('categoryId').map(Number).filter(Boolean),
    species,
    speciesAvail,
  })

  await saveProductPartIds(id, partEntries)

  // Images: uploaded files first, then picks from the Media library, each once.
  const { addImageOnce, mediaImage } = await import('../../lib/image-dupes.server')
  const altText = `${name} photo`
  for (const file of files) {
    const res = await saveUpload(file, { slug: name })
    if (!res.error) await addImageOnce(id, { ...res, altText }, { ownsFile: true })
  }
  for (const path of f.getAll('mediaPath').map(String)) {
    const img = await mediaImage(path)
    if (img) await addImageOnce(id, { ...img, altText })
  }

  await log(user, 'product.updated', {
    entityType: 'product', entityId: id, entityLabel: name,
    details: { changed: [{ field: 'status', from: '—', to: 'created' }] },
  })
  await syncProductsJson().catch(() => {})

  throw redirect(`/admin/products?saved=${id}&sortBy=id&sortDir=desc`)
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue w-full'
const Label = ({ children, hint }) => (
  <span className="text-sm font-medium text-gray-700">
    {children}{hint && <span className="ml-1.5 font-normal text-gray-400">{hint}</span>}
  </span>
)

export default function ProductNew() {
  const { categoryTree } = useLoaderData()
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

      <Form id="new-product-form" method="post" encType="multipart/form-data" className="flex flex-col gap-6">

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Images</h2>
          <p className="-mt-2 text-xs text-gray-500">The first one is used on the catalogue card. They are added when you create the product.</p>
          <ImageDropZone autoSubmit={false} hint="JPG, PNG, WebP or AVIF · several at once" />
          <MediaPicker formId="new-product-form" />
        </section>

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
          <div className="flex flex-col gap-1.5">
            <Label>Categories</Label>
            <CategoryPicker tree={categoryTree} />
          </div>
          <label className="flex flex-col gap-1.5"><Label>Description</Label>
            <textarea name="description" rows={5} className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Dimensions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Size shown to customers</Label>
              <input name="sizeDisplay" className={field} placeholder='e.g. 11/16 x 3-1/2"' /></label>
            <label className="flex flex-col gap-1.5"><Label>Unit of measure</Label>
              <UomSelect className={field} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><Label>Thickness</Label>
              <input name="thicknessIn" className={field} inputMode="decimal" placeholder="0.6875" /></label>
            <label className="flex flex-col gap-1.5"><Label>Width</Label>
              <input name="widthIn" className={field} inputMode="decimal" placeholder="3.5" /></label>
          </div>
          <p className="text-xs text-gray-500">Decimal inches. These drive the width filter and sorting, so 5-1/4 is entered as 5.25.</p>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Species &amp; Availability</h2>
          <p className="-mt-2 text-xs text-gray-500">
            Set how each wood ships. The product's overall availability is derived automatically from these.
          </p>
          <SpeciesPicker />
          <label className="flex flex-col gap-1.5"><Label>Lead time</Label>
            <input name="leadTime" placeholder="e.g. approximately 1 week" className={field} /></label>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-serif font-bold text-tundora">Search listing</h2>
          <SeoFields formId="new-product-form" Label={Label} field={field}
            initial={{ name: '', productCode: '', description: '', size: '', species: [] }} />
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
