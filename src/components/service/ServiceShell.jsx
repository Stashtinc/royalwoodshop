import { Link } from 'react-router'
import { services } from '../../data/services'

/**
 * Shared pieces for the service pages.
 *
 * Only the parts that genuinely should be identical live here — the crumb,
 * the closing call to action, the cross-links. The body of each page is
 * composed for its own content: a process is a sequence, a delivery area is a
 * map, a list of blades is a list. Four pages built from one template read as
 * one page shown four times, which is the note this exists to answer.
 */

export function Crumb({ title }) {
  return (
    <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
      <Link to="/services" className="transition-colors hover:text-royal-blue">Services</Link>
      <span className="mx-2 text-gray-300">/</span>
      <span className="text-gray-700">{title}</span>
    </nav>
  )
}

export function ServiceCta({
  heading = 'Want to start your project? Get a free quote.',
  body,
  tone = 'blue',
}) {
  const dark = tone === 'blue'
  return (
    <section className={`w-full py-14 lg:py-16 ${dark ? 'bg-royal-blue' : 'bg-parchment'}`}>
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 text-center lg:px-8">
        <h2 className={`font-serif text-2xl font-bold lg:text-[30px] ${dark ? 'text-white' : 'text-royal-blue'}`}>
          {heading}
        </h2>
        <p className={`max-w-[560px] font-sans text-base ${dark ? 'text-white/80' : 'text-gray-600'}`}>
          {body ?? (
            <>
              Call <a href="tel:9057271387" className="underline hover:opacity-80">905-727-1387</a>,
              or send us the details and we&rsquo;ll come back to you.
            </>
          )}
        </p>
        <Link
          to="/contact"
          className={`rounded-lg px-6 py-3.5 font-sans text-base font-medium transition-colors ${
            dark
              ? 'bg-white text-royal-blue hover:bg-parchment'
              : 'bg-royal-blue text-white hover:bg-royal-blue-dark'
          }`}
        >
          Contact us
        </Link>
      </div>
    </section>
  )
}

export function OtherServices({ current }) {
  const others = services.filter((s) => s.slug !== current)
  return (
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
  )
}
