import { Link } from 'react-router-dom'

const commitments = [
  {
    title: 'California Phase 2 Compliant',
    description:
      'Our MDF mouldings and dimensional boards comply with California Phase 2 standards under Federal Safety Regulations. These products contain no formaldehyde — a carcinogen that is harmful to breathe when cutting and installing product.',
  },
  {
    title: 'FSC Certification',
    description:
      'The Forest Stewardship Council (FSC) validates that lumber originates from responsibly managed forests meeting strict environmental and social criteria. Most products we carry that are not already certified can be certified by request, and we intend to achieve full FSC certification across all product lines.',
  },
  {
    title: 'Sustainable Forest Management',
    description:
      'Wood is a renewable resource. We support sustainable forestry practices that balance the demand for quality building materials with responsible, long-term stewardship of Canada’s forests.',
  },
]

const stats = [
  { value: '50+ Years', label: 'Net forest growth has surpassed forest removals' },
  { value: '<0.5%', label: 'Of Canada’s managed forests are harvested annually' },
  { value: '91%', label: 'Of Canada’s original forest cover still remains — more than any other country' },
]

export default function EnvironmentalCommitment() {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[1147px] flex-col gap-6 px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            Doing Our Part to Protect the Environment
          </h1>
          <p className="max-w-[760px] font-sans text-lg leading-relaxed text-gray-600">
            Quality, Service &amp; Selection since 1982 &mdash; specializing in trim, mouldings,
            and interior doors for Toronto, the GTA, and York Region, with a lasting commitment to
            responsible sourcing.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 lg:px-8">
          {commitments.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8 lg:flex-row lg:items-start lg:gap-10"
            >
              <p className="font-serif text-xl font-bold text-royal-blue lg:w-[280px] lg:shrink-0">
                {item.title}
              </p>
              <p className="font-sans text-base leading-relaxed text-gray-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full bg-parchment py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl font-bold text-royal-blue">
              Canada&rsquo;s Forests, By the Numbers
            </h2>
            <p className="font-sans text-base leading-relaxed text-gray-600">
              Growing trees produce more oxygen than mature ones, and harvest-and-regeneration
              cycles help lock in CO2 &mdash; sustainable forestry keeps this cycle working in
              everyone&rsquo;s favour.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-2 rounded-2xl bg-white p-8 text-center"
              >
                <p className="font-serif text-3xl font-bold text-royal-blue">{stat.value}</p>
                <p className="font-sans text-sm leading-relaxed text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-royal-blue py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1147px] flex-col items-start gap-5 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-white lg:text-3xl">
            Questions about our sourcing or certifications?
          </h2>
          <Link
            to="/contact"
            className="w-fit rounded-lg border border-white bg-white px-6 py-3 font-sans text-sm text-royal-blue transition-colors hover:bg-white/90"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  )
}
