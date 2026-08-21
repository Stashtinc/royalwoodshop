import { Link } from 'react-router'
import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'
import EnquiryForm from '../../components/service/EnquiryForm'
import Testimonials from '../../components/service/Testimonials'

/**
 * Estimate & Quotation.
 *
 * Every word here is theirs, taken from
 * royalwoodshop.com/material-estimate-and-quotation — headings, capitalisation
 * and punctuation included. An earlier version of this page invented a
 * three-step process ("Get in touch / We come to site / You get a written
 * quotation") that appears nowhere on their site. That was not mine to write.
 *
 * Two of their oddities are carried over rather than corrected, because
 * quietly editing a client's copy while porting it is how you end up with a
 * site that no longer says what they approved:
 *   - "material quotation/ estimate" (missing space before the slash)
 *   - "volume discount / factory direct price"
 * Both are flagged for Royal Wood Shop to decide on.
 *
 * What is ours is the arrangement: their first two sections sit beside the
 * enquiry form, and "Competitive Prices" is lifted into a band of its own,
 * since it is the commercial point of the page and reads as filler in a stack.
 */

const sections = [
  {
    title: 'On-site Quotation',
    body: 'Unsure where to start? For large projects and full home renovations, a member of our Royal Wood Shop team will head over to your site and help to determine what materials and supplies you’ll need. We’ll also help to measure for trims, doors, and come back to you with a material quotation/ estimate for your build.',
  },
]

export default function Estimate() {
  return (
    <>
      {/* Title, their copy and the form in one two-column block. The ask on
          this page is "get me a number", so everything needed to decide sits
          in a single view: what they do down the left, the way to start it on
          the right. On #fbfbfb rather than white so the form reads as a card
          rather than an outlined rectangle. */}
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <Crumb title="Estimate & Quotation" />
          <div className="mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            <div className="flex flex-col">
              <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
                We&rsquo;ll determine what you need
              </p>
              <h1 className="mt-4 font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
                Estimate &amp; Quotation
              </h1>
              <p className="mt-4 max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
                Need an on-site quotation? Our team is available to quote and offer mill-direct
                pricing on whole house orders and large projects.
              </p>

              <h2 className="mt-10 mb-7 font-serif text-2xl font-bold text-[#24140d] lg:mt-12 lg:text-[30px]">
                Material Estimate and Quotation Services
              </h2>

              {sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-3 pb-7">
                  <p className="font-serif text-xl font-bold text-royal-blue">{section.title}</p>
                  <p className="font-sans text-base leading-relaxed text-gray-600 lg:text-lg">
                    {section.body}
                  </p>
                </div>
              ))}

              {/* Their consultation section, with both links it carries. */}
              <div className="flex flex-col gap-3 border-t border-gray-200 pt-7">
                <p className="font-serif text-xl font-bold text-royal-blue">Consultation</p>
                <p className="font-sans text-base leading-relaxed text-gray-600 lg:text-lg">
                  If you require further consultation or would like to ask our team of experts a
                  question, do not hesitate to{' '}
                  <Link to="/contact" className="text-royal-blue underline">
                    visit us in-store or to give us a call
                  </Link>
                  . With years of experience under our belt, if we don&rsquo;t have an answer for
                  you, we&rsquo;ll be sure to find one.
                </p>
                <Link
                  to="/consultation"
                  className="mt-1 inline-flex w-fit items-center gap-1.5 font-sans text-sm font-medium text-royal-blue hover:underline"
                >
                  Read More
                  <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Sticky again: the left column is long enough to scroll past. */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <EnquiryForm idPrefix="estimate" />
            </div>
          </div>
        </div>
      </section>

      {/* Their third section, given the weight it earns. */}
      <section className="w-full bg-royal-blue py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="font-sans text-sm font-bold tracking-wide text-white/60 uppercase">
              Competitive Prices
            </p>
            <h2 className="max-w-[680px] font-serif text-2xl leading-snug font-bold text-white lg:text-[32px]">
              Whole house renovations or new builds are eligible for a volume discount / factory
              direct price.
            </h2>
            <p className="font-sans text-base text-white/80">
              Call us at 905-727-1387 for more details.
            </p>
          </div>
          <a
            href="tel:9057271387"
            className="shrink-0 rounded-lg bg-white px-7 py-4 text-center font-sans text-lg font-medium text-royal-blue transition-colors hover:bg-parchment"
          >
            905-727-1387
          </a>
        </div>
      </section>

      <Testimonials />

      <ServiceCta heading="Want To Start Your Project? Get a Free Quote!" />
      <OtherServices current="material-estimate-and-quotation" />
    </>
  )
}
