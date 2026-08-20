import { useState } from 'react'

/**
 * The enquiry form, matching the fields the old site asked for:
 * Your Name, Your Email, Phone Number, Your Message.
 *
 * Same markup and field pattern as the form on /contact, extracted so the two
 * cannot drift apart.
 *
 * NOTE: like the contact form, this does not send anywhere yet — submitting
 * shows the confirmation and nothing leaves the browser. Wiring it to an inbox
 * is a separate job, and until it is done nobody should rely on it.
 */

const field =
  'rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none'
const labelClass = 'font-sans text-sm font-medium text-tundora'

export default function EnquiryForm({ heading = 'Get Free Consultation Today!' }) {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="consult-name" className={labelClass}>Your Name (required)</label>
            <input id="consult-name" name="name" type="text" required className={field} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="consult-email" className={labelClass}>Your Email (required)</label>
            <input id="consult-email" name="email" type="email" required className={field} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="consult-phone" className={labelClass}>Phone Number (required)</label>
            <input id="consult-phone" name="phone" type="tel" required className={field} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="consult-message" className={labelClass}>Your Message</label>
            <textarea id="consult-message" name="message" rows={4} className={field} />
          </div>

          <button
            type="submit"
            className="mt-1 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3.5 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  )
}
