import { Link } from 'react-router'
import { ServiceCta } from '../components/service/ServiceShell'
import servicesHero from '../assets/images/services-hero.jpg'
import DownloadList from '../components/DownloadList'

const RESOURCES = [
  {
    slug: 'pre-hanging-service',
    title: 'Door Pre-Hanging Service',
    description: 'The pre-hanging options in one sheet: hinges, door swing, jamb, stop, lead time and machining.',
    format: 'PDF',
    href: '/downloads/pre-hanging-service.pdf',
  },
]

/**
 * Door Pre-Hanging Service. The copy is the client's, from the revised service sheet.
 */

const HINGE_OPTIONS = [
  { term: 'Hinge size', value: '3″ × 3″ for a 1-3/8″ door, or 3.5″ × 3.5″ for a 1-3/4″ door' },
  { term: 'Number of hinges', value: '3 hinges on 80″ and 84″ doors, 4 hinges on 90″ and 96″ doors' },
  { term: 'Hinge colour', value: 'Satin nickel or black' },
  { term: 'Hinge radius', value: '5/8″ radius or 1/4″ radius' },
  { term: 'Square hinges', value: 'Square-corner hinge option' },
  { term: 'Ball bearing upgrade', value: '3 × 3 × 5/8″ or 3.5 × 3.5 × 1/4″ (+$31.00)' },
]

const SINGLE_DOOR = [
  'Door machined for hinges, handle bore, drive-in latch and faceplate mortise',
  'Hinge prep on the hinge jamb, and strike prep on the strike jamb',
  'Loose square door stops',
]

const DOUBLE_DOOR = [
  'Door machined for hinges only',
  'Hinge prep on the hinge jambs',
  'Loose square door stops',
]

function Step({ number, title, children }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-blue font-sans text-sm font-bold text-white">{number}</span>
        <h2 className="font-serif text-xl font-bold text-royal-blue lg:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function PreHangingService() {
  return (
    <>
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
            <Link to="/resources" className="transition-colors hover:text-royal-blue">Resources</Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">Pre-Hanging Service</span>
          </nav>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Door Pre-Hanging Service
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            We machine and prepare your door before it leaves the shop, so it is ready to hang on site.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-6 lg:px-8">
          <Step number="1" title="Choose your hinges">
            <div className="grid gap-8 md:grid-cols-[1fr_280px] md:items-center">
              <dl className="divide-y divide-gray-100">
                {HINGE_OPTIONS.map((row) => (
                  <div key={row.term} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
                    <dt className="font-sans text-sm font-semibold text-tundora">{row.term}</dt>
                    <dd className="font-sans text-sm leading-relaxed text-gray-600">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <img src="/images/pre-hanging/hinge.jpg" alt="Black hinge with rounded corners" className="w-full rounded-xl bg-[#fbfbfb] p-4" loading="lazy" />
            </div>
          </Step>

          <Step number="2" title="Specify your door swing">
            <div className="grid gap-8 md:grid-cols-[1fr_280px] md:items-center">
              <p className="font-sans text-base leading-relaxed text-gray-600">
                Choose the hand of the door: left hand (LH) or right hand (RH).
              </p>
              <img src="/images/pre-hanging/door-swing.png" alt="Door swing diagrams showing left-hand and right-hand doors" className="w-full rounded-xl bg-[#fbfbfb] p-4" loading="lazy" />
            </div>
          </Step>

          <Step number="3" title="Door jamb & Stop">
            <div className="grid gap-8 md:grid-cols-[1fr_280px] md:items-center">
              <p className="font-sans text-base leading-relaxed text-gray-600">
                Choose the jamb to suit your wall. FJ Primed Pine is available in 4-5/8″ for a 2×4 wall with ½″ drywall,
                or 6-5/8″ for a 2×6 wall with ½″ drywall.
              </p>
              <img src="/images/pre-hanging/door-jamb.jpg" alt="Primed pine door jamb" className="w-full rounded-xl bg-[#fbfbfb] p-4" loading="lazy" />
            </div>
            <p className="mt-6 font-sans text-base leading-relaxed text-gray-600">Plain 3/8 × 1 primed stop.</p>
          </Step>

          <Step number="4" title="Lead time">
            <p className="font-sans text-base leading-relaxed text-gray-600">
              Please allow approximately 1 week. We confirm the lead time when you place your order.
            </p>
          </Step>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6">
              <h2 className="font-serif text-xl font-bold text-tundora">Singles: 1-3/8″ or 1-3/4″</h2>
              <ul className="flex flex-col gap-2 font-sans text-sm leading-relaxed text-gray-600">
                {SINGLE_DOOR.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6">
              <h2 className="font-serif text-xl font-bold text-tundora">Doubles: 1-3/8″ or 1-3/4″</h2>
              <ul className="flex flex-col gap-2 font-sans text-sm leading-relaxed text-gray-600">
                {DOUBLE_DOOR.map((item) => <li key={item}>• {item}</li>)}
              </ul>
              <p className="font-sans text-sm text-gray-500">Ask us about our magnetic door catches.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-3xl">Resources</h2>
          <div className="mt-8">
            <DownloadList files={RESOURCES} />
          </div>
        </div>
      </section>

      <ServiceCta heading="Ready to order a pre-hung door?" body="Contact us to get started." />
    </>
  )
}
