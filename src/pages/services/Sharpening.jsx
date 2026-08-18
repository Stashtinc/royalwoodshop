import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'

/**
 * Saw Blade Sharpening — the page for trades.
 *
 * The audience is someone with a dull blade in the truck, so the page is dense
 * and utilitarian: the schedule up front, the full list of what we take set as
 * a list rather than prose, and the FS Tool reasoning kept to one side as
 * supporting material. Dark hero, because this is the one service that is not
 * about a finished room.
 */

const blades = [
  'Table saw blades', 'Chop saw blades', 'Dado blades', 'Planer knives',
  'Router bits', 'Hand tools', 'Band saw blades', 'Moulder knives',
]

const reasons = [
  'Application-specific geometry allows for excellent cut quality',
  'Heavier carbide tip allows for more sharpening, producing significant cost savings',
  'High-grade steel body reduces run out for greater cutting accuracy',
  'Superior carbide grade increases run time and extends blade life',
]

export default function Sharpening() {
  return (
    <>
      {/* Dark, tight hero with the one operational fact that matters. */}
      <section className="w-full bg-[#24140d] py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="[&_a]:text-white/60 [&_span]:text-white/40 text-white/60">
            <Crumb title="Saw Blade Sharpening" />
          </div>
          <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5">
              <h1 className="max-w-[620px] font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
                Drop it off. Collect it sharp.
              </h1>
              <p className="max-w-[560px] font-sans text-lg leading-relaxed text-white/70">
                We sharpen all brands of knives and blades.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-6 py-5">
              <p className="font-sans text-xs font-bold tracking-wide text-white/50 uppercase">
                Collection schedule
              </p>
              <p className="mt-1.5 font-serif text-2xl font-bold text-white">Twice per week</p>
              <p className="mt-1 max-w-[260px] font-sans text-sm text-white/60">
                Our on-site technician drops off and picks up blades at FS Tool.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we take — a working list, two columns, no cards. */}
      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-20 lg:px-8">
          <div>
            <h2 className="mb-8 font-serif text-2xl font-bold text-[#24140d] lg:text-[30px]">
              Blades and knives we sharpen
            </h2>
            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {blades.map((blade) => (
                <li
                  key={blade}
                  className="flex items-center gap-3 border-b border-gray-100 py-3.5 font-sans text-base text-gray-700"
                >
                  <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-royal-blue"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5 8 14.5 16 6" />
                  </svg>
                  {blade}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-sans text-base text-gray-600">
              Not on the list? Bring it in and we&rsquo;ll tell you whether it can be sharpened.
            </p>
          </div>

          {/* Supporting material, visually subordinate. */}
          <aside className="flex h-fit flex-col gap-5 rounded-2xl bg-[#fbfbfb] p-8">
            <p className="font-serif text-xl font-bold text-[#24140d]">
              Why buy a quality FS Tool blade?
            </p>
            <ul className="flex flex-col gap-4">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 font-sans text-sm leading-relaxed text-gray-600">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-royal-blue/50" />
                  {reason}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <ServiceCta
        tone="parchment"
        heading="Bring your blades to the showroom."
        body={
          <>
            18237 Woodbine Ave, East Gwillimbury. Open Monday to Friday, and Saturday mornings.
            Call <a href="tel:9057271387" className="underline hover:opacity-80">905-727-1387</a> if
            you want to check we can take it.
          </>
        }
      />
      <OtherServices current="saw-blade-sharpening" />
    </>
  )
}
