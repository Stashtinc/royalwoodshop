import { Link } from 'react-router'
import staffPhoto from '../assets/images/staff-photo-delivery-truck.jpg'

const coreValues = [
  {
    title: 'A Family Oriented Experience',
    description:
      'Established in 1982 as a family enterprise, we emphasize respectful, helpful, and friendly service to each customer. We prioritize delivering products that combine aesthetic appeal with dependability and safety, consistently centering customer needs.',
  },
  {
    title: 'Transparency',
    description:
      'We maintain honest and transparent service without misleading clients or making unrealistic promises. When product availability doesn’t align with your timeline, our team communicates directly and proposes alternative solutions.',
  },
  {
    title: 'Resourcefulness',
    description:
      'If a requested item isn’t available in-store, you can depend on our team to locate and procure it using our industry expertise and established supplier connections to identify suitable options.',
  },
  {
    title: 'Charitable Participation',
    description:
      'We actively support community causes, sponsoring organizations including the Southlake Foundation, Marquee Theatrical Productions, and local sports teams.',
  },
]

export default function CoreValues() {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 lg:flex-row lg:items-center lg:gap-14 lg:px-8">
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
              Core Values
            </h1>
            <p className="max-w-[560px] font-sans text-xl font-medium text-royal-blue">
              Working to provide the best customer and community service.
            </p>
            <p className="max-w-[560px] font-sans text-lg leading-relaxed text-gray-600">
              The Royal Wood Shop operates according to four foundational principles that we
              apply to our daily operations and customer interactions &mdash; a commitment to our
              patrons and to the broader community we&rsquo;re part of.
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
          {coreValues.map((value, index) => (
            <div
              key={value.title}
              className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8 transition-shadow duration-300 hover:shadow-lg"
            >
              <span className="font-serif text-sm font-bold text-royal-blue/40">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="font-serif text-xl font-bold text-[#24140d]">{value.title}</p>
              <p className="font-sans text-base leading-relaxed text-gray-600">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full bg-royal-blue py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1147px] flex-col items-start gap-5 px-6 lg:px-8">
          <p className="font-sans text-xs font-bold tracking-wide text-white/70 uppercase">
            Quality, Service &amp; Selection since 1982
          </p>
          <h2 className="font-serif text-2xl font-bold text-white lg:text-3xl">
            Have a project in mind? Let&rsquo;s talk it through.
          </h2>
          <Link
            to="/contact"
            className="mt-2 w-fit rounded-lg border border-white bg-white px-6 py-3 font-sans text-sm text-royal-blue transition-colors hover:bg-white/90"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  )
}
