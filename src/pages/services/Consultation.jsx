import { Link } from 'react-router'
import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'
import EnquiryForm from '../../components/service/EnquiryForm'
import Testimonials from '../../components/service/Testimonials'
import staffPhoto from '../../assets/images/staff-photo-delivery-truck.jpg'

/**
 * Consultation.
 *
 * The words are the client's, taken from royalwoodshop.com/consultation and
 * left as they wrote them — headings included. An earlier version of this page
 * rewrote them into invented questions, which is not what was asked for.
 *
 * What is ours is the arrangement: the enquiry form sits alongside the three
 * reasons rather than above them, so the page answers "why come in" and offers
 * the way to do it in the same view.
 */

const reasons = [
  {
    title: 'Expert Advice',
    body: 'Our team of experts are equipped to answer all of your questions and to offer comprehensive advice backed by years of experience. Whether you’re a contractor, a new homebuyer, or a DIYer, we can help to guide you in the right direction.',
  },
  {
    title: 'Quoting',
    body: 'Need a quote for your new mouldings, doors, porch railings, or pillars? The Royal Wood Shop has you covered. We provide honest and reliable quoting that will help you to stay within your project budget. For large builds or renovations, we also offer on-site quoting to determine exactly what you’ll need.',
  },
  {
    title: 'Transparent Delivery Predictions',
    body: 'We know you’re busy and respect honesty. That’s why we never over promise and under deliver. With your project timeline in mind, we’ll be transparent when it comes to delivery schedules and special order fulfillment.',
  },
]

export default function Consultation() {
  return (
    <>
      {/* Hero — their slider line and page title. */}
      <section className="w-full bg-royal-blue">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_42%]">
          <div className="flex flex-col justify-center gap-5 px-6 py-16 lg:py-24 lg:pl-[max(2rem,calc((100vw-1280px)/2))] lg:pr-14">
            <Crumb title="Consultation" onBlue />
            <p className="font-sans text-sm font-bold tracking-wide text-white/70 uppercase">
              Providing consultation on projects of all sizes
            </p>
            <h1 className="font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
              Consultation
            </h1>
            <p className="max-w-[540px] font-sans text-lg leading-relaxed text-white/80">
              Our team of experts are equipped to answer all of your questions and to offer
              comprehensive advice backed by years of industry experience.
            </p>
          </div>
          <div className="relative min-h-[260px] lg:min-h-[480px]">
            <img
              src={staffPhoto}
              alt="The Royal Wood Shop team outside the showroom"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Their three reasons, alongside the form they asked for. */}
      <section className="w-full bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16 lg:px-8">
          <div>
            <h2 className="mb-10 font-serif text-2xl font-bold text-[#24140d] lg:text-[30px]">
              Why Come In For a Consultation?
            </h2>

            <div className="flex flex-col">
              {reasons.map((reason, index) => (
                <div
                  key={reason.title}
                  className={`flex flex-col gap-3 py-7 ${index > 0 ? 'border-t border-gray-100' : 'pt-0'}`}
                >
                  <p className="font-serif text-xl font-bold text-royal-blue">{reason.title}</p>
                  <p className="font-sans text-base leading-relaxed text-gray-600 lg:text-lg">
                    {reason.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-8 rounded-2xl bg-[#fbfbfb] px-6 py-5 font-sans text-base leading-relaxed font-medium text-royal-blue lg:text-lg">
              Call us at{' '}
              <a href="tel:9057271387" className="underline">905-727-1387</a>{' '}
              or come{' '}
              <Link to="/contact" className="underline">in-store</Link>{' '}
              to discuss your project with us. We&rsquo;re happy to help!
            </p>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <EnquiryForm idPrefix="consultation" />
          </div>
        </div>
      </section>

      <Testimonials />

      <ServiceCta heading="Want To Start Your Project? Get a Free Quote!" />
      <OtherServices current="consultation" />
    </>
  )
}
