import { Link } from 'react-router'
import { services } from '../data/services'

/**
 * One layout for every service page.
 *
 * The old site rebuilt each of these by hand in Elementor, which is why they
 * drifted — three different heading styles, and a contact form repeated four
 * times. Here the copy is data and the layout is shared, so a new service is a
 * few lines in src/data/services.js.
 */
export default function ServiceDetail({ service }) {
  const others = services.filter((s) => s.slug !== service.slug)

  return (
    <>
      {/* ── intro ─────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 font-sans text-sm text-gray-500">
            <Link to="/services" className="transition-colors hover:text-royal-blue">Services</Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">{service.title}</span>
          </nav>

          <div className="flex flex-col gap-5">
            {service.eyebrow && (
              <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
                {service.eyebrow}
              </p>
            )}
            <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
              {service.title}
            </h1>
            <p className="max-w-[760px] font-sans text-lg leading-relaxed text-gray-600">
              {service.lead}
            </p>
          </div>
        </div>
      </section>

      {/* ── what it covers ────────────────────────────────────────────── */}
      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          {service.heading && (
            <h2 className="mb-10 font-serif text-2xl font-bold text-[#24140d] lg:text-[28px]">
              {service.heading}
            </h2>
          )}

          {service.highlights && (
            <div className="mb-10">
              {service.highlightsTitle && (
                <p className="mb-4 font-serif text-lg font-bold text-[#24140d]">
                  {service.highlightsTitle}
                </p>
              )}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {service.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-[#fbfbfb] px-4 py-3 font-sans text-sm text-gray-700"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-royal-blue"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10.5 8 14.5 16 6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {service.sections.map((section, index) => (
              <div
                key={section.title}
                className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-8 transition-shadow duration-300 hover:shadow-lg"
              >
                <span className="font-serif text-sm font-bold text-royal-blue/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="font-serif text-xl font-bold text-[#24140d]">{section.title}</p>
                {section.body && (
                  <p className="font-sans text-base leading-relaxed text-gray-600">{section.body}</p>
                )}
                {section.list && (
                  <ul className="flex flex-col gap-2">
                    {section.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 font-sans text-base leading-relaxed text-gray-600">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-royal-blue/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.link && (
                  <Link
                    to={section.link.to}
                    className="mt-auto inline-flex items-center gap-1.5 pt-1 font-sans text-sm font-medium text-royal-blue hover:underline"
                  >
                    {section.link.label}
                    <span aria-hidden>&rarr;</span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {service.closing && (
            <p className="mt-10 max-w-[760px] font-sans text-lg leading-relaxed font-medium text-royal-blue">
              {service.closing}
            </p>
          )}
        </div>
      </section>

      {/* ── call to action ────────────────────────────────────────────── */}
      <section className="w-full bg-royal-blue py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-white lg:text-[30px]">
            Want to start your project? Get a free quote.
          </h2>
          <p className="max-w-[560px] font-sans text-base text-white/80">
            Call <a href="tel:9057271387" className="underline hover:text-white">905-727-1387</a>,
            or send us the details and we&rsquo;ll come back to you.
          </p>
          <Link
            to="/contact"
            className="rounded-lg bg-white px-6 py-3.5 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-parchment"
          >
            Contact us
          </Link>
        </div>
      </section>

      {/* ── the other services ────────────────────────────────────────── */}
      <section className="w-full bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <h2 className="mb-6 font-serif text-xl font-bold text-[#24140d]">Other services</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {others.map((other) => (
              <Link
                key={other.slug}
                to={other.path}
                className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6 transition-shadow duration-300 hover:shadow-lg"
              >
                <p className="font-serif text-lg font-bold text-[#24140d] group-hover:text-royal-blue">
                  {other.title}
                </p>
                <p className="font-sans text-sm leading-relaxed text-gray-600">{other.eyebrow}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
