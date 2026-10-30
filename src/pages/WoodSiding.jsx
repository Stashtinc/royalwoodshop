import { Crumb, ServiceCta } from '../components/service/ServiceShell'
import woodSidingImage from '../assets/images/cat-wood-composite.jpg'
import DownloadList from '../components/DownloadList'

/**
 * Wood Siding: Cape Cod pre-finished Canadian siding. The copy is the client's,
 * from the original site. The page follows the Custom Millwork layout.
 */

const FINISH_STEPS = [
  {
    title: 'Kiln dried',
    body: 'We carefully kiln dry the Western Lodgepole Pine, to 12–15% moisture content.',
  },
  {
    title: 'Two-coat acrylic',
    body: 'A uniform 100% acrylic coating on five sides, including the back. Adhesion is not attainable with field-applied paint.',
  },
  {
    title: '15-year warranty',
    body: 'The factory-applied two-coat finish is backed by a 15-year limited warranty against peeling, chalking and blistering.',
  },
]

const SPECS = [
  ['Species', 'Western Lodgepole Pine'],
  ['Drying', 'Kiln dried to 12–15% moisture content'],
  ['Coating', 'Two-coat 100% acrylic system on five sides, including one coat on the back'],
  ['Warranty', '15-year limited coating warranty. See Cape Cod Product Protection Plan for details.'],
  ['Lengths', 'Random odd and even 3–16 feet, heavy to 12, 14 and 16 feet'],
  ['Fasteners', 'Stainless steel siding fasteners, in traditional nails or hidden fasteners. Colour-matched.'],
  ['Trim nails', 'Stainless steel, 3¼″ (5 lb box), double nailed'],
  ['Touch-up paint', '1 litre can (do not freeze)'],
  ['Caulking', 'Available in standard colours'],
  ['Estimating', 'See the order information form'],
]


const RESOURCES = [
  {
    slug: 'cape-cod-siding-brochure',
    title: 'Cape Cod Siding Brochure',
    description: 'The Cape Cod pre-finished siding range, with its profiles and finishes.',
    format: 'PDF',
    href: '/downloads/cape-cod-siding-brochure.pdf',
  },
  {
    slug: 'cape-cod-colour-selector',
    title: 'Cape Cod Colour Selector',
    description: 'Browse the Cape Cod colour range before you choose your finish.',
    format: 'PDF',
    href: '/downloads/cape-cod-colour-selector.pdf',
  },
  {
    slug: 'cape-cod-siding-installation-guide',
    title: 'Cape Cod Siding Installation Guide',
    description: 'Installation instructions for Cape Cod pre-finished wood siding.',
    format: 'PDF',
    href: '/downloads/cape-cod-siding-installation-guide.pdf',
  },
]

export default function WoodSiding() {
  return (
    <>
      <section className="w-full bg-royal-blue">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_42%]">
          <div className="flex flex-col justify-center gap-5 px-6 py-16 lg:py-24 lg:pl-[max(2rem,calc((100vw-1280px)/2))] lg:pr-14">
            <Crumb title="Wood Siding" onBlue />
            <h1 className="font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
              Wood Siding, Pre-Finished in a Range of Colours
            </h1>
            <p className="max-w-[540px] font-sans text-lg leading-relaxed text-white/80">
              Cape Cod pre-finished Canadian-made siding. Wood siding engineered by nature.
            </p>
          </div>
          <div className="relative min-h-[260px] lg:min-h-[480px]">
            <img
              src={woodSidingImage}
              alt="Pre-finished wood siding"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Enjoy the traditional aesthetics of 100% Canadian softwood siding, combined with durability and strength.
            Manufactured in Halifax.
          </p>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Nothing influences the impression your home makes more than its exterior finish, and natural wood siding is
            the preferred choice. Now you can enjoy the warmth and character of Western Canadian Lodgepole Pine with a
            factory-applied, low-maintenance finish.
          </p>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            For your new home or renovation project, choose Cape Cod pre-finished wood siding from The Royal Wood Shop.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-3xl">How it is finished</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {FINISH_STEPS.map((step) => (
              <div key={step.title} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="font-serif text-lg font-bold text-tundora">{step.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-3xl">Let our colours inspire you</h2>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            From traditional favourites that stand the test of time, to today&rsquo;s current trends, our colour experts
            do the hard work for you. All you need to do is choose.
          </p>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Our designers have selected a wide range of standard colours. If you have something specific in mind, our
            colour laboratory can capture it and reproduce it correctly, every time. You will receive a colour sample so
            you can see exactly how your siding will look on your home.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-3xl">Profiles for every style</h2>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            From the traditional horizontal rabbeted bevel, to vertical board and batten, or the sleek contemporary
            channel, Cape Cod gives you siding and trim profiles that add distinctive architectural detail to your home.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[860px] flex-col gap-8 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-3xl">Specifications</h2>
          <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            {SPECS.map(([term, value]) => (
              <div key={term} className="grid gap-2 px-6 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                <dt className="font-sans text-sm font-semibold text-tundora">{term}</dt>
                <dd className="font-sans text-sm leading-relaxed text-gray-600">{value}</dd>
              </div>
            ))}
          </dl>
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

      <ServiceCta
        heading="Ready to start your siding project?"
        body="Contact us to get started."
      />
    </>
  )
}
