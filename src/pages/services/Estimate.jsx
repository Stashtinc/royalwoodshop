import { Link } from 'react-router'
import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'

/**
 * Estimate & Quotation — the page about a process.
 *
 * Composed as a sequence, because that is what it is: you call, someone comes
 * out, a number comes back. A vertical stepper with a connecting rule makes
 * the order legible at a glance, which a grid of equal cards cannot do.
 */

const steps = [
  {
    label: 'Get in touch',
    body: 'Call, email, or come into the showroom with whatever you have — drawings, a room count, or a rough idea. Nothing needs to be finalised.',
  },
  {
    label: 'We come to site',
    body: 'For large projects and full home renovations, a member of our team will head over to your site and help determine what materials and supplies you’ll need. We’ll also measure for trims and doors.',
  },
  {
    label: 'You get a written quotation',
    body: 'We come back to you with a material quotation and estimate for your build — itemised, so you can see what is driving the number rather than just the total.',
  },
]

export default function Estimate() {
  return (
    <>
      {/* Centred, typographic hero — no photograph competing with the numbers. */}
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[860px] flex-col items-center gap-6 px-6 text-center">
          <Crumb title="Estimate & Quotation" />
          <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
            We&rsquo;ll determine what you need
          </p>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Material estimates and on-site quotation
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            Unsure where to start? Our team is available to quote and offer mill-direct pricing
            on whole house orders and large projects.
          </p>
        </div>
      </section>

      {/* The sequence. */}
      <section className="w-full bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-[900px] px-6 lg:px-8">
          <ol className="relative flex flex-col gap-12">
            {/* The rule that turns three blocks into one process. */}
            <span
              aria-hidden
              className="absolute top-3 bottom-3 left-[23px] hidden w-px bg-royal-blue/15 sm:block"
            />
            {steps.map((step, index) => (
              <li key={step.label} className="relative flex flex-col gap-4 sm:flex-row sm:gap-8">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-royal-blue/20 bg-white font-serif text-lg font-bold text-royal-blue">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-2 pt-1">
                  <p className="font-serif text-xl font-bold text-[#24140d] lg:text-[24px]">
                    {step.label}
                  </p>
                  <p className="max-w-[600px] font-sans text-base leading-relaxed text-gray-600 lg:text-lg">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The commercial point, given its own weight. */}
      <section className="w-full bg-royal-blue py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="font-sans text-sm font-bold tracking-wide text-white/60 uppercase">
              Competitive prices
            </p>
            <h2 className="max-w-[620px] font-serif text-2xl leading-snug font-bold text-white lg:text-[32px]">
              Whole house renovations and new builds are eligible for a volume discount and
              factory-direct price.
            </h2>
          </div>
          <a
            href="tel:9057271387"
            className="shrink-0 rounded-lg bg-white px-7 py-4 text-center font-sans text-lg font-medium text-royal-blue transition-colors hover:bg-parchment"
          >
            905-727-1387
          </a>
        </div>
      </section>

      {/* Sideways link out, rather than a repeated card. */}
      <section className="w-full bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-[900px] px-6 lg:px-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8">
            <p className="font-serif text-xl font-bold text-[#24140d]">
              Still working out what you want?
            </p>
            <p className="font-sans text-base leading-relaxed text-gray-600">
              If you need further consultation, or would like to ask our team a question, do not
              hesitate to visit us in-store or give us a call. With years of experience under our
              belt, if we don&rsquo;t have an answer for you, we&rsquo;ll be sure to find one.
            </p>
            <Link
              to="/consultation"
              className="mt-2 inline-flex items-center gap-1.5 font-sans text-sm font-medium text-royal-blue hover:underline"
            >
              Read about consultations
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <ServiceCta tone="parchment" heading="Ready for a number? Let’s put one together." />
      <OtherServices current="material-estimate-and-quotation" />
    </>
  )
}
