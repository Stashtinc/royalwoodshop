import { useState } from 'react'
import MapEmbed from '../components/MapEmbed'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

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
              <p>(905) 000-0000</p>
            </div>
            <div>
              <p className="font-medium text-royal-blue">Email</p>
              <p>info@royalwoodshop.com</p>
            </div>
            <div>
              <p className="font-medium text-royal-blue">Hours</p>
              <p>Monday – Friday, 8:00am – 5:00pm</p>
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="font-sans text-sm font-medium text-tundora">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="font-sans text-sm font-medium text-tundora">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="font-sans text-sm font-medium text-tundora">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
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
                  rows={5}
                  required
                  className="rounded-lg border border-gray-300 px-4 py-3 font-sans focus:border-royal-blue focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-fit rounded-lg border border-royal-blue bg-royal-blue px-6 py-4 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>

      <MapEmbed />
    </div>
  )
}
