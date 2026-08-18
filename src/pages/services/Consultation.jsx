import { Link } from 'react-router'
import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'
import { testimonials } from '../../data/services'
import staffPhoto from '../../assets/images/staff-photo-delivery-truck.jpg'

/**
 * Consultation — the page about people.
 *
 * Composed as a conversation: what you can ask, answered in the second person,
 * with the counter-argument to "why bother coming in" carried by customers
 * rather than by us. Wide asymmetric split, quotes as the visual anchor.
 */

const asks = [
  {
    question: 'I don’t know where to start.',
    answer:
      'Our team of experts are equipped to answer all of your questions and to offer comprehensive advice backed by years of experience. Whether you’re a contractor, a new homebuyer, or a DIYer, we can help to guide you in the right direction.',
  },
  {
    question: 'What is this going to cost me?',
    answer:
      'Need a quote for your new mouldings, doors, porch railings, or pillars? We provide honest and reliable quoting that will help you stay within your project budget. For large builds or renovations, we also offer on-site quoting to determine exactly what you’ll need.',
  },
  {
    question: 'When will it actually arrive?',
    answer:
      'We know you’re busy and respect honesty. That’s why we never over promise and under deliver. With your project timeline in mind, we’ll be transparent when it comes to delivery schedules and special order fulfillment.',
  },
]

export default function Consultation() {
  return (
    <>
      {/* Asymmetric hero — text held tight against a full-bleed photograph. */}
      <section className="w-full bg-royal-blue">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_45%]">
          <div className="flex flex-col justify-center gap-6 px-6 py-16 lg:py-24 lg:pl-[max(2rem,calc((100vw-1280px)/2))] lg:pr-14">
            <Crumb title="Consultation" onBlue />
            <h1 className="max-w-[600px] font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
              Come in with a question. Leave with an answer.
            </h1>
            <p className="max-w-[520px] font-sans text-lg leading-relaxed text-white/80">
              Providing consultation on projects of all sizes — from a single room to a
              whole house.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="tel:9057271387"
                className="rounded-lg bg-white px-5 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-parchment"
              >
                905-727-1387
              </a>
              <Link
                to="/contact"
                className="rounded-lg border border-white/40 px-5 py-3 font-sans text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                Visit the showroom
              </Link>
            </div>
          </div>
          <div className="relative min-h-[280px] lg:min-h-[520px]">
            <img
              src={staffPhoto}
              alt="The Royal Wood Shop team outside the showroom"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Questions and answers, as a conversation rather than feature cards. */}
      <section className="w-full bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <h2 className="mb-12 max-w-[620px] font-serif text-2xl font-bold text-[#24140d] lg:text-[30px]">
            Whatever you walked in wondering, someone here has been asked it before.
          </h2>

          <dl className="flex flex-col">
            {asks.map((ask, index) => (
              <div
                key={ask.question}
                className={`grid grid-cols-1 gap-4 py-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-14 ${
                  index > 0 ? 'border-t border-gray-100' : ''
                }`}
              >
                <dt className="font-serif text-xl leading-snug font-bold text-royal-blue lg:text-[24px]">
                  &ldquo;{ask.question}&rdquo;
                </dt>
                <dd className="font-sans text-base leading-relaxed text-gray-600 lg:text-lg">
                  {ask.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The case made by customers, not by us. */}
      <section className="w-full bg-parchment py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <p className="mb-10 font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
            What people tell us afterwards
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col gap-5 border-t-2 border-royal-blue/20 pt-6">
                <blockquote className="font-serif text-lg leading-relaxed text-[#24140d]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-auto font-sans text-sm font-medium text-gray-500">
                  {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <ServiceCta
        heading="Bring your drawings, or just your questions."
        body={
          <>
            Call <a href="tel:9057271387" className="underline hover:opacity-80">905-727-1387</a>,
            or come into the showroom in East Gwillimbury. No appointment needed.
          </>
        }
      />
      <OtherServices current="consultation" />
    </>
  )
}
