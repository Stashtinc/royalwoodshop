import { Crumb, ServiceCta } from '../components/service/ServiceShell'
import customMillworkImage from '../assets/images/custom-millwork.png'

/**
 * Custom Millwork.
 *
 * Replaces the All Services page. The hero follows the service pages: the title and
 * its lead on blue, the photograph alongside. The copy is the client's.
 */

export default function CustomMillwork() {
  return (
    <>
      <section className="w-full bg-royal-blue">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_42%]">
          <div className="flex flex-col justify-center gap-5 px-6 py-16 lg:py-24 lg:pl-[max(2rem,calc((100vw-1280px)/2))] lg:pr-14">
            <Crumb title="Custom Millwork" onBlue />
            <h1 className="font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
              Custom Trim &amp; Mouldings
            </h1>
            <p className="max-w-[540px] font-sans text-lg leading-relaxed text-white/80">
              The profile you need. Even when it isn&rsquo;t on the shelf.
            </p>
          </div>
          <div className="relative min-h-[260px] lg:min-h-[480px]">
            <img
              src={customMillworkImage}
              alt="Oak door with a raised-panel profile, machined and finished in the shop"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Can&rsquo;t find the right Design? Royal Wood Shop can help reproduce hardwood moulding profiles and
            made-to-order interior doors for projects requiring specific dimensions, species or architectural details.
          </p>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            From matching original trim in a renovation to coordinating custom mouldings and doors for a new home,
            our team helps turn your drawings, samples and specifications into the finished materials your project
            requires.
          </p>
        </div>
      </section>

      <ServiceCta />
    </>
  )
}
