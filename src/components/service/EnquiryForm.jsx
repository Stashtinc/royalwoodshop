import { useActionData, useFetcher } from 'react-router'

/**
 * The enquiry form, matching the fields the old site asked for:
 * Your Name, Your Email, Phone Number, Your Message.
 *
 * Same markup and field pattern as the form on /contact, extracted so the two
 * cannot drift apart. `idPrefix` keeps the label/field pairing valid if two
 * instances ever land on one page — duplicate ids silently break the click
 * target on the second one.
 *
 * It posts to the action of the page it sits on (Consultation, Material
 * Estimate), which stores the enquiry and emails it to sales@, the same way
 * /contact does. A fetcher keeps the visitor on the page and in place.
 */

const field =
  'rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none'
const labelClass = 'font-sans text-sm font-medium text-tundora'

const FieldError = ({ children }) =>
  children ? <p className="font-sans text-sm text-red-700">{children}</p> : null

export default function EnquiryForm({ heading = 'Get Free Consultation Today!', idPrefix = 'enquiry' }) {
  const fetcher = useFetcher()
  // Without JavaScript the browser posts the page itself; its answer arrives as
  // the page's action data instead of the fetcher's.
  const actionData = useActionData()
  const data = fetcher.data ?? actionData
  const sending = fetcher.state !== 'idle'
  const submitted = data?.ok
  const errors = data?.errors ?? {}
  const values = data?.values ?? {}

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 lg:p-8">
      <p className="font-serif text-xl font-bold text-[#24140d]">{heading}</p>

      {submitted ? (
        <div className="flex flex-col gap-3 rounded-lg bg-parchment px-5 py-6">
          <p className="font-serif text-lg font-bold text-royal-blue">Thanks — we&rsquo;ve got it.</p>
          <p className="font-sans text-sm leading-relaxed text-gray-600">
            A member of the team will be in touch. If it&rsquo;s urgent, call{' '}
            <a href="tel:9057271387" className="font-medium text-royal-blue underline">905-727-1387</a>.
          </p>
        </div>
      ) : (
        <fetcher.Form method="post" className="relative flex flex-col gap-4">
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px]">
            <label>Company<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${idPrefix}-name`} className={labelClass}>Your Name (required)</label>
            <input id={`${idPrefix}-name`} name="name" defaultValue={values.name} type="text" required className={field} />
            <FieldError>{errors.name}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${idPrefix}-email`} className={labelClass}>Your Email (required)</label>
            <input id={`${idPrefix}-email`} name="email" defaultValue={values.email} type="email" required className={field} />
            <FieldError>{errors.email}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${idPrefix}-phone`} className={labelClass}>Phone Number (required)</label>
            <input id={`${idPrefix}-phone`} name="phone" defaultValue={values.phone} type="tel" required className={field} />
            <FieldError>{errors.phone}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${idPrefix}-message`} className={labelClass}>Your Message</label>
            <textarea id={`${idPrefix}-message`} name="message" defaultValue={values.message} rows={4} className={field} />
            <FieldError>{errors.message}</FieldError>
          </div>

          {data?.formError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
              {data.formError}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="mt-1 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3.5 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </fetcher.Form>
      )}
    </div>
  )
}
