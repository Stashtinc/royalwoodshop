import { Crumb, ServiceCta, OtherServices } from '../../components/service/ServiceShell'

/**
 * Delivery — the page about reach.
 *
 * The question a contractor actually has is "do you come to me", so the
 * coverage area is the hero rather than a paragraph three sections down. The
 * guarantees run as a horizontal band; place names are set large enough to be
 * scanned for your own town.
 */

const areas = [
  'York Region', 'Greater Toronto Area', 'Collingwood',
  'Barrie', 'Muskoka', 'Haliburton',
]

/**
 * Line icons, drawn to the same rules as the rest of the site: 24px grid,
 * currentColor, round joins. Decorative — each one sits directly above the
 * words it illustrates, so they are hidden from screen readers rather than
 * given labels that would just be read out twice.
 *
 * Drawn at 40px. The stroke is 1.25 rather than the 1.5 used elsewhere
 * because the viewBox scales the stroke along with everything else: at this
 * size 1.5 renders as a 2.5px line, which reads as a heavier icon set than
 * the rest of the site rather than the same one, larger.
 */
function Icon({ children }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-royal-blue"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function IconTag() {
  return (
    <Icon>
      <path d="M11.6 2.9H4.5a1.6 1.6 0 0 0-1.6 1.6v7.1c0 .43.17.83.47 1.13l7.2 7.2a1.6 1.6 0 0 0 2.26 0l7.2-7.2a1.6 1.6 0 0 0 0-2.26l-7.2-7.2a1.6 1.6 0 0 0-1.13-.47Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </Icon>
  )
}

function IconShield() {
  return (
    <Icon>
      <path d="M12 21.2c4.4-1.9 6.6-5 6.6-9.3V5.8L12 3.2 5.4 5.8v6.1c0 4.3 2.2 7.4 6.6 9.3Z" />
    </Icon>
  )
}

function IconClipboardCheck() {
  return (
    <Icon>
      <path d="M9.4 4.6H7.6a1.9 1.9 0 0 0-1.9 1.9v12.6a1.9 1.9 0 0 0 1.9 1.9h8.8a1.9 1.9 0 0 0 1.9-1.9V6.5a1.9 1.9 0 0 0-1.9-1.9h-1.8" />
      <rect x="9.4" y="2.8" width="5.2" height="3.6" rx="1.1" />
      <path d="M9.5 13.6l1.9 1.9 3.5-3.9" />
    </Icon>
  )
}

function IconTruck() {
  return (
    <Icon>
      <rect x="2.8" y="6.4" width="10" height="9.4" rx="1.4" />
      <path d="M12.8 9.9h3.4l3.2 3.1v2.8h-6.6" />
      <circle cx="7.1" cy="18.3" r="1.9" />
      <circle cx="16.3" cy="18.3" r="1.9" />
      <path d="M9 18.3h5.4" />
    </Icon>
  )
}

const promises = [
  { title: 'Cost-effective and convenient', body: 'One delivery charge, scheduled around your build.', Glyph: IconTag },
  { title: 'Safe transportation', body: 'Loaded and secured so long trim arrives straight.', Glyph: IconShield },
  { title: 'Quality assurance', body: 'Checked against your order before it leaves the yard.', Glyph: IconClipboardCheck },
  { title: 'Dedicated product driver', body: 'Someone who knows the material, not a courier.', Glyph: IconTruck },
]

export default function Delivery() {
  return (
    <>
      {/* Coverage first — the answer to the only question that matters. */}
      <section className="w-full bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <Crumb title="Delivery Service" />
          <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-20">
            <div className="flex flex-col gap-6">
              <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
                We deliver as far north as Haliburton.
              </h1>
              <p className="font-sans text-lg leading-relaxed text-gray-600">
                No matter which products or supplies you require for your project, we have your
                delivery logistics covered and guarantee your order will arrive safely and on time.
              </p>
              <a
                href="tel:9057271387"
                className="w-fit rounded-lg bg-royal-blue px-6 py-3.5 font-sans text-base font-medium text-white transition-colors hover:bg-royal-blue-dark"
              >
                Schedule a delivery
              </a>
            </div>

            <div className="flex flex-col gap-4">
              <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
                Where we deliver
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-3">
                {areas.map((area) => (
                  <li
                    key={area}
                    className="rounded-lg border border-royal-blue/15 bg-[#fbfbfb] px-5 py-2.5 font-serif text-lg text-[#24140d]"
                  >
                    {area}
                  </li>
                ))}
                <li className="rounded-lg border border-dashed border-royal-blue/30 px-5 py-2.5 font-sans text-base text-royal-blue">
                  and more — just ask
                </li>
              </ul>
              <p className="pt-2 font-sans text-sm text-gray-500">
                Outside these areas? Call and we&rsquo;ll tell you honestly whether we can reach you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees as a band, not cards. */}
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {promises.map((promise) => (
              <div key={promise.title} className="flex flex-col gap-2 py-6 lg:px-7 lg:py-0 lg:first:pl-0 lg:last:pr-0">
                <promise.Glyph />
                <p className="mt-2 font-serif text-lg leading-snug font-bold text-[#24140d]">
                  {promise.title}
                </p>
                <p className="font-sans text-sm leading-relaxed text-gray-600">{promise.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One line worth pulling out. */}
      <section className="w-full bg-parchment py-16 lg:py-20">
        <div className="mx-auto max-w-[900px] px-6 text-center lg:px-8">
          <p className="font-serif text-2xl leading-snug font-bold text-royal-blue lg:text-[32px]">
            Time is money. Let us take care of delivery while you focus on your craft.
          </p>
          <p className="mt-5 font-sans text-base text-gray-600">
            To learn more, give us a call at{' '}
            <a href="tel:9057271387" className="font-medium text-royal-blue underline">905-727-1387</a>.
          </p>
        </div>
      </section>

      <ServiceCta heading="Need it on site by a date? Tell us the date." />
      <OtherServices current="delivery" />
    </>
  )
}
