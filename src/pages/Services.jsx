import { Link } from 'react-router'
import { services } from '../data/services'
import staffPhoto from '../assets/images/staff-photo-delivery-truck.jpg'

/**
 * The services index.
 *
 * The old page carried six tiles, two of which were not services: a Contact Us
 * tile duplicating the header button, and "Become a Royal Contractor", whose
 * page now redirects to the homepage — a dead link on their own site. Both are
 * dropped rather than carried over.
 */
export default function Services() {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 lg:flex-row lg:items-center lg:gap-14 lg:px-8">
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
              Services
            </h1>
            <p className="max-w-[560px] font-sans text-xl font-medium text-royal-blue">
              Expert consultation, competitive quotation, agile delivery.
            </p>
            <p className="max-w-[560px] font-sans text-lg leading-relaxed text-gray-600">
              Supplying the material is half the job. Our team helps you work out what you need,
              what it will cost, and when it will arrive &mdash; and keeps your blades sharp while
              you are at it.
            </p>
          </div>

          <div className="w-full shrink-0 overflow-hidden rounded-2xl lg:w-[480px]">
            <img
              src={staffPhoto}
              alt="The Royal Wood Shop team in front of a delivery truck"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:px-8">
          {services.map((service, index) => (
            <Link
              key={service.slug}
              to={service.path}
              className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8 transition-shadow duration-300 hover:shadow-lg"
            >
              <span className="font-serif text-sm font-bold text-royal-blue/40">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="font-serif text-xl font-bold text-[#24140d] group-hover:text-royal-blue">
                {service.title}
              </p>
              <p className="font-sans text-base leading-relaxed text-gray-600">{service.lead}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-sans text-sm font-medium text-royal-blue">
                Read more
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="w-full bg-royal-blue py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-white lg:text-[30px]">
            Want to start your project? Get a free quote.
          </h2>
          <p className="max-w-[560px] font-sans text-base text-white/80">
            Call <a href="tel:9057271387" className="underline hover:text-white">905-727-1387</a>,
            or send us the details and we&rsquo;ll come back to you.
          </p>
          <Link
            to="/contact"
            className="rounded-lg bg-white px-6 py-3.5 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-parchment"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
