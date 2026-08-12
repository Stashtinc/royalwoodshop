import { Link } from 'react-router-dom'

const differentiators = [
  {
    title: 'Extensive Inventory',
    description:
      'One of the deepest selections of mouldings and doors in the GTA, with hundreds of trim profiles and smooth dimensional boards in stock up to 16 feet long — including Poplar, Primed MDF, Primed FJ Poplar, Primed FJ Pine, Red Oak, White Oak, White Pine, Hard Maple, and Douglas Fir.',
  },
  {
    title: 'Customer Service Philosophy',
    description:
      'Built on family values, our team provides respectful, helpful, comprehensive service to each customer, with multiple floor staff ready to consult on projects of any size and locate or customize products as needed.',
  },
  {
    title: 'Product Quality Standards',
    description:
      'We use premium grade kiln dried species and base our profiles on classic rules of balance and proportion. Most products carry FSC certification, and all primed MDF is CARB compliant and formaldehyde-free.',
  },
  {
    title: 'Warehouse Access',
    description:
      'Customers can handpick inventory directly from our warehouse, creating a direct connection between the materials in your hands and the project you are building.',
  },
  {
    title: 'Delivery Services',
    description:
      'Flexible delivery throughout the Greater Toronto Area, with on-site consultation available for large contracting jobs.',
  },
  {
    title: 'Specialist Positioning',
    description:
      'Unlike big box retailers, we focus exclusively on interior finish materials — trim, doors, and millwork — giving us deeper expertise and a cleaner, more considered offering.',
  },
]

const advantages = [
  'Focused expertise in trim, doors, and millwork',
  'Stocked profiles plus custom ordering capabilities',
  'Consistent local supply with reliable timelines',
  'Expert guidance from trade-knowledgeable staff',
]

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WhatMakesUsDifferent() {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[1147px] flex-col gap-6 px-6 lg:px-8">
          <p className="font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
            Quality. Service. Selection.
          </p>
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            The Royal Edge: What Makes Us Different
          </h1>
          <p className="max-w-[760px] font-sans text-lg leading-relaxed text-gray-600">
            The Royal Edge is our identity, our values, and our goals as a leading moulding and
            door supplier. It&rsquo;s what shows up in every distinctive, premium product we carry
            and every expert consultation we offer &mdash; and it&rsquo;s what sets us apart from
            the competition.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue">What Sets Us Apart</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6 transition-shadow duration-300 hover:shadow-lg"
              >
                <p className="font-serif text-lg font-bold text-[#24140d]">{item.title}</p>
                <p className="font-sans text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-parchment py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 lg:grid-cols-2 lg:px-8">
          <div className="flex flex-col gap-5">
            <h2 className="font-serif text-2xl font-bold text-royal-blue">
              Why Designers &amp; Contractors Choose Us
            </h2>
            <ul className="flex flex-col gap-4">
              {advantages.map((advantage) => (
                <li key={advantage} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-royal-blue/10 text-royal-blue">
                    <CheckIcon />
                  </span>
                  <span className="font-sans text-base leading-relaxed text-gray-600">
                    {advantage}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-royal-blue/20 bg-white p-8">
            <p className="font-serif text-lg leading-snug font-bold text-[#24140d]">
              Competitive, Price-Matched Pricing
            </p>
            <p className="font-sans text-base leading-relaxed text-gray-600">
              We offer competitive pricing on every product we carry, and we&rsquo;ll match
              pricing on comparable in-stock products from local suppliers &mdash; so you never
              have to choose between quality and value.
            </p>
            <p className="mt-2 font-serif text-base font-bold text-royal-blue">
              Quality, Service &amp; Selection since 1982.
            </p>
            <Link
              to="/contact"
              className="mt-2 w-fit rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-sm text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
