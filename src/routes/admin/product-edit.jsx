import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import {
  getProduct, saveProduct, diffProduct, listImages, addImage, updateImage,
  removeImage, moveImage,
} from '../../lib/admin-queries.server'
import { log } from '../../lib/activity.server'
import { saveUpload, deleteUpload, describeLimits } from '../../lib/uploads.server'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'
import ImageDropZone from '../../components/admin/ImageDropZone'
import { thumbSrc } from '../../lib/images'

export async function loader({ request, params }) {
  await requireUser(request)
  const product = await getProduct(params.id)
  if (!product) throw new Response('Not found', { status: 404 })
  return { product, images: await listImages(params.id), limits: describeLimits() }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = String(f.get('intent') ?? 'details')

  if (intent === 'upload') {
    const files = f.getAll('images').filter((x) => typeof x !== 'string')
    if (!files.length) return { error: 'No files were selected.' }
    const product = await getProduct(params.id)
    const errors = []
    let added = 0
    for (const file of files) {
      const res = await saveUpload(file, { slug: product?.slug })
      if (res.error) { errors.push(res.error); continue }
      await addImage(params.id, {
        storageKey: res.storageKey,
        width: res.width,
        height: res.height,
        altText: `${product?.name ?? 'Product'} photo`,
      })
      added++
    }
    if (added) {
      await log(user, 'image.added', {
        entityType: 'product', entityId: params.id, entityLabel: product?.name,
        details: { count: added },
      })
    }
    return errors.length
      ? { error: errors.join(' '), saved: added ? `${added} added.` : undefined }
      : { saved: `${added} image${added === 1 ? '' : 's'} added.` }
  }

  if (intent === 'image-alt') {
    await updateImage(f.get('imageId'), { altText: String(f.get('altText') ?? '') })
    await log(user, 'image.updated', {
      entityType: 'product', entityId: params.id,
      entityLabel: (await getProduct(params.id))?.name,
      details: { field: 'description', to: String(f.get('altText') ?? '') },
    })
    return { saved: 'Description updated.' }
  }

  if (intent === 'image-role') {
    await updateImage(f.get('imageId'), { role: String(f.get('role') ?? 'product_photo') })
    await log(user, 'image.updated', {
      entityType: 'product', entityId: params.id,
      entityLabel: (await getProduct(params.id))?.name,
      details: { field: 'type', to: String(f.get('role')) },
    })
    return { saved: 'Image type updated.' }
  }

  if (intent === 'image-move') {
    await moveImage(params.id, f.get('imageId'), String(f.get('direction')))
    await log(user, 'image.reordered', {
      entityType: 'product', entityId: params.id,
      entityLabel: (await getProduct(params.id))?.name,
    })
    return { saved: 'Order updated.' }
  }

  if (intent === 'image-delete') {
    const key = await removeImage(f.get('imageId'))
    if (key) await deleteUpload(key)
    await log(user, 'image.deleted', {
      entityType: 'product', entityId: params.id,
      entityLabel: (await getProduct(params.id))?.name,
      details: { file: key ?? 'external' },
    })
    return { saved: 'Image removed.' }
  }

  const name = String(f.get('name') ?? '').trim()
  if (!name) return { error: 'A product needs a name.' }

  const avail = String(f.get('availability') ?? '')
  const num = (v) => {
    const t = String(v ?? '').trim()
    return t === '' || Number.isNaN(Number(t)) ? null : t
  }

  const before = await getProduct(params.id)
  const payload = {
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
  }

  const changed = diffProduct(before, payload)
  await saveProduct(params.id, payload)

  if (changed.length) {
    // Whether a product is visible to customers is a milestone; everything
    // else about it is detail.
    const statusChange = changed.find((c) => c.field === 'status')
    if (statusChange) {
      await log(user, 'product.status', {
        entityType: 'product', entityId: params.id, entityLabel: payload.name,
        details: { from: statusChange.from, to: statusChange.to },
      })
    }
    const rest = changed.filter((c) => c.field !== 'status')
    if (rest.length) {
      await log(user, 'product.updated', {
        entityType: 'product', entityId: params.id, entityLabel: payload.name,
        details: { changed: rest },
      })
    }
  }

  return { saved: changed.length ? `Saved — ${changed.map((c) => c.field).join(', ')} updated.` : 'No changes to save.' }
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'
const Label = ({ children, hint }) => (
  <span className="text-sm font-medium text-gray-700">
    {children}{hint && <span className="ml-1.5 font-normal text-gray-400">{hint}</span>}
  </span>
)

const ROLE_LABEL = {
  profile_drawing: 'Profile drawing — shown whole, never cropped',
  product_photo: 'Photograph — fills the frame',
  installed_photo: 'Installed — fills the frame',
}

function ImagesSection() {
  const { product, images, limits } = useLoaderData()

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif font-bold text-tundora">Images</h2>
        <p className="text-xs text-gray-500">
          {images.length} image{images.length === 1 ? '' : 's'} · first one is used on the catalogue card
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-white ring-1 ring-gray-100">
                <img src={thumbSrc(img.storageKey, img.width)} alt={img.altText} loading="lazy" className="h-full w-full object-contain" />
              </div>

              <Form method="post" className="flex flex-col gap-1.5">
                <input type="hidden" name="intent" value="image-alt" />
                <input type="hidden" name="imageId" value={img.id} />
                {img.width && (
                  <p className="text-[10px] text-gray-400">{img.width}×{img.height} · responsive set generated</p>
                )}
                <label className="text-[11px] font-medium text-gray-600">
                  Description <span className="font-normal text-gray-400">(read aloud by screen readers, and used by Google)</span>
                </label>
                <div className="flex gap-1.5">
                  <input name="altText" defaultValue={img.altText}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-royal-blue" />
                  <button className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs hover:border-gray-400">Save</button>
                </div>
              </Form>

              <div className="flex items-center gap-1.5">
                <Form method="post" className="flex-1">
                  <input type="hidden" name="intent" value="image-role" />
                  <input type="hidden" name="imageId" value={img.id} />
                  <select name="role" defaultValue={img.role} title="Controls how this image is displayed on the site"
                    onChange={(e) => e.currentTarget.form.requestSubmit()}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-royal-blue">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Form>

                <Form method="post">
                  <input type="hidden" name="intent" value="image-move" />
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button disabled={i === 0} title="Move earlier"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="image-move" />
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button disabled={i === images.length - 1} title="Move later"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                </Form>
                <Form method="post" onSubmit={(e) => { if (!confirm('Remove this image?')) e.preventDefault() }}>
                  <input type="hidden" name="intent" value="image-delete" />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button title="Remove"
                    className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:border-red-400">✕</button>
                </Form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Form method="post" encType="multipart/form-data" className="flex flex-col gap-3">
        <input type="hidden" name="intent" value="upload" />
        <ImageDropZone
          hint={`JPG, PNG, WebP, AVIF or SVG · up to ${limits.maxMb} MB each · several at once`}
        />
        <button className="w-fit rounded-lg bg-royal-blue px-5 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
          Upload
        </button>
      </Form>
    </section>
  )
}

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

      {data?.saved && <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">{data.saved}</p>}
      {data?.error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>}

      <ImagesSection />

      <Form method="post" className="flex flex-col gap-6">
        <input type="hidden" name="intent" value="details" />
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
