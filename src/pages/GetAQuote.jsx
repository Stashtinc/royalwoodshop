import { useRef, useState } from 'react'
import { Form, useActionData, useNavigation } from 'react-router'
import ProductPicker from '../components/quote/ProductPicker'
import Thumb from '../components/quote/Thumb'
import { UOM_OPTIONS, AVAILABILITY_LABEL } from '../lib/catalogue-constants'

/**
 * Get a Quote: for renovations, new builds and large orders.
 *
 * The customer picks products (any number, from the dropdown), sets a quantity
 * and a note per line, attaches plans or schedules, and sends. The team gets
 * the whole request by email with the files attached.
 */

const field =
  'rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none'
const label = 'font-sans text-sm font-medium text-tundora'
const ACCEPT = '.pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp'

const FieldError = ({ children }) =>
  children ? <p className="font-sans text-sm text-red-700">{children}</p> : null

const Section = ({ title, hint, children }) => (
  <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 lg:p-8">
    <div className="flex flex-col gap-1">
      <h2 className="font-serif text-xl font-bold text-royal-blue">{title}</h2>
      {hint && <p className="font-sans text-sm text-gray-500">{hint}</p>}
    </div>
    {children}
  </section>
)

const uomLabel = (code) => UOM_OPTIONS.find(([c]) => c === code)?.[1] ?? code

export default function GetAQuote({ products }) {
  const data = useActionData()
  const sending = useNavigation().state === 'submitting'
  const errors = data?.errors ?? {}
  const values = data?.values ?? {}
  const submitted = data?.ok

  const [items, setItems] = useState([])
  const [files, setFiles] = useState([])
  const fileInput = useRef(null)

  const addedIds = new Set(items.map((i) => i.productId))

  function addProducts(picked) {
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.productId))
      const fresh = picked
        .filter((p) => !have.has(p.id))
        .map((p) => ({ productId: p.id, name: p.name, productCode: p.productCode, uom: p.uom, sizeDisplay: p.sizeDisplay, availability: p.availability, image: p.image, imageWidth: p.imageWidth, imageRole: p.imageRole, quantity: 1, note: '' }))
      return [...prev, ...fresh]
    })
  }

  const updateItem = (productId, patch) =>
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i)))
  const removeItem = (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId))

  // The file input is the source of truth for what gets sent, so the list shown
  // here is written back into it whenever a file is added or removed.
  function syncFiles(next) {
    setFiles(next)
    if (fileInput.current) {
      const dt = new DataTransfer()
      next.forEach((f) => dt.items.add(f))
      fileInput.current.files = dt.files
    }
  }
  function onPickFiles(e) {
    syncFiles([...files, ...Array.from(e.target.files)])
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-16 lg:py-24">
        <div className="rounded-2xl border border-royal-blue/20 bg-white p-10 text-center">
          <p className="font-serif text-2xl font-bold text-royal-blue">Thank you, your quote request is in.</p>
          <p className="mt-3 font-sans text-lg text-gray-600">
            A member of the team will review your products and files and be in touch. If it is urgent,
            call <a href="tel:9057271387" className="font-medium text-royal-blue underline">905-727-1387</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#fbfbfb]">
      <div className="mx-auto flex max-w-[860px] flex-col gap-8 px-6 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-4">
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[40px]">Get a Quote</h1>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            For renovations, new builds and large orders. Choose the products you need, attach your
            plans or door schedule, and our team will come back to you with a quote.
          </p>
        </div>

        <Form method="post" encType="multipart/form-data" className="flex flex-col gap-6">
          {/* Honeypot. Hidden from people; bots fill it in. */}
          <div aria-hidden="true" className="hidden">
            <label>Website<input type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note })))} />

          <Section title="Your details" hint="Fields marked * are required.">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={label}>Your name *</span>
                <input name="name" defaultValue={values.name} required className={field} />
                <FieldError>{errors.name}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Company</span>
                <input name="company" defaultValue={values.company} className={field} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Email *</span>
                <input name="email" type="email" defaultValue={values.email} required className={field} />
                <FieldError>{errors.email}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Phone *</span>
                <input name="phone" type="tel" defaultValue={values.phone} required className={field} />
                <FieldError>{errors.phone}</FieldError>
              </label>
            </div>
          </Section>

          <Section
            title="Products"
            hint="Search the catalogue and tick as many products as you need. Set a quantity for each one."
          >
            <ProductPicker products={products} addedIds={addedIds} onAdd={addProducts} />

            {items.length > 0 && (
              <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
                {items.map((item) => (
                  <li key={item.productId} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Thumb product={item} />
                        <div className="flex min-w-0 flex-col">
                        <span className="font-sans text-sm font-medium text-gray-900">{item.name}</span>
                        <span className="font-sans text-xs text-gray-500">
                          {[item.productCode, item.sizeDisplay, AVAILABILITY_LABEL[item.availability], item.uom && uomLabel(item.uom)].filter(Boolean).join(' · ')}
                        </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="shrink-0 font-sans text-sm text-gray-500 hover:text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <label className="flex flex-col gap-1.5">
                        <span className="font-sans text-xs font-medium text-gray-600">Quantity</span>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          step={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.productId, { quantity: e.target.value })}
                          className={field}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="font-sans text-xs font-medium text-gray-600">Note (optional)</span>
                        <input
                          type="text"
                          maxLength={300}
                          value={item.note}
                          placeholder="e.g. length, finish, which room"
                          onChange={(e) => updateItem(item.productId, { note: e.target.value })}
                          className={field}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <FieldError>{errors.items}</FieldError>
          </Section>

          <Section
            title="Plans and files"
            hint="PDF plans, door schedules and spreadsheets (PDF, XLS, XLSX, CSV), or photos (JPG, PNG, WebP). Up to 10 files, 10 MB each, 15 MB in total."
          >
            <div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded-lg bg-royal-blue px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-royal-blue-dark"
              >
                Choose files
              </button>
              <input
                ref={fileInput}
                type="file"
                name="files"
                multiple
                accept={ACCEPT}
                onChange={onPickFiles}
                className="hidden"
              />
            </div>
            {files.length > 0 && (
              <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 truncate font-sans text-sm text-gray-800">
                      {f.name} <span className="text-gray-500">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => syncFiles(files.filter((_, j) => j !== i))}
                      className="shrink-0 font-sans text-sm text-gray-500 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <FieldError>{errors.files}</FieldError>
          </Section>

          <Section title="About your project" hint="Rooms, quantities you are unsure of, timing, delivery address. Anything that helps us quote.">
            <label className="flex flex-col gap-2">
              <span className={label}>Project notes</span>
              <textarea name="notes" rows={5} defaultValue={values.notes} className={field} />
              <FieldError>{errors.notes}</FieldError>
            </label>
          </Section>

          {data?.formError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 font-sans text-sm text-red-700">{data.formError}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-sm text-gray-500">
              Prefer to talk it through? Call <a href="tel:9057271387" className="text-royal-blue hover:underline">905-727-1387</a>.
            </p>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-royal-blue px-8 py-3.5 font-sans text-base font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send quote request'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  )
}
