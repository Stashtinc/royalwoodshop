import { Form, useActionData, useNavigation } from 'react-router'
import MapEmbed from '../components/MapEmbedClient'

const FieldError = ({ children }) =>
  children ? <p className="font-sans text-sm text-red-700">{children}</p> : null

export default function Contact() {
  const data = useActionData()
  const sending = useNavigation().state === 'submitting'
  const submitted = data?.ok
  const errors = data?.errors ?? {}
  const values = data?.values ?? {}

  return (
    <div className="w-full bg-[#fbfbfb]">
      <div className="mx-auto flex max-w-[1147px] flex-col gap-14 px-6 py-16 lg:flex-row lg:px-8 lg:py-24">
        <div className="flex flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
              Contact Us
            </h1>
            <p className="font-sans text-lg leading-relaxed text-gray-600">
              Have a project in mind or need a quote? Send us a message and our team will
              get back to you shortly.
            </p>
          </div>

          <div className="flex flex-col gap-6 font-sans text-lg text-gray-600">
            <div>
              <p className="font-medium text-royal-blue">Showroom</p>
              <p>18237 Woodbine Ave, Sharon, ON L0G 1V0</p>
            </div>
            <div>
              <p className="font-medium text-royal-blue">Phone</p>
              <p><a href="tel:9057271387" className="hover:underline">905-727-1387</a></p>
            </div>
            <div>
              <p className="font-medium text-royal-blue">Email</p>
              <p>info@royalwoodshop.com</p>
            </div>
            <div>
              <p className="font-medium text-royal-blue">Hours</p>
              <p>Monday – Friday, 7:00am – 5:30pm</p>
              <p>Saturday, 9:00am – 4:00pm</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {submitted ? (
            <div className="rounded-2xl border border-royal-blue/20 bg-white p-10 text-center">
              <p className="font-serif text-2xl font-bold text-royal-blue">Thank you!</p>
              <p className="mt-3 font-sans text-lg text-gray-600">
                We&rsquo;ve received your message and will be in touch soon.
              </p>
            </div>
          ) : (
            <Form method="post" className="flex flex-col gap-5">
              {/* Honeypot: hidden from people, irresistible to bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px]">
                <label>Company<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="font-sans text-sm font-medium text-tundora">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  defaultValue={values.name}
                  type="text"
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
                <FieldError>{errors.name}</FieldError>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="font-sans text-sm font-medium text-tundora">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  defaultValue={values.email}
                  type="email"
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
                <FieldError>{errors.email}</FieldError>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="font-sans text-sm font-medium text-tundora">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  defaultValue={values.phone}
                  type="tel"
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="font-sans text-sm font-medium text-tundora">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  defaultValue={values.message}
                  rows={5}
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
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
                className="mt-2 w-fit rounded-lg border border-royal-blue bg-royal-blue px-6 py-4 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </Form>
          )}
        </div>
      </div>

      <MapEmbed />
    </div>
  )
}
