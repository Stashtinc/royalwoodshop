import { testimonials } from '../../data/services'

/**
 * Customer quotes, with a hierarchy.
 *
 * The previous version set three quotes in three equal columns under three
 * identical hairlines, which gives the eye no reason to start anywhere — so it
 * read as filler regardless of how good the quotes were.
 *
 * One quote is now given display size and the room to be read, with the rest
 * as supporting cards. The oversized quotation mark is set in the site's own
 * serif rather than an imported graphic: for a company that sells profiles cut
 * into wood, a letterform is a more honest ornament than an icon.
 */

const featured = testimonials.find((t) => t.featured) ?? testimonials[0]
const supporting = testimonials.filter((t) => t !== featured).slice(0, 3)

export default function Testimonials({ eyebrow = 'Testimonial' }) {
  return (
    <section className="w-full bg-parchment py-16 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
          {eyebrow}
        </p>

        {/* The one worth reading properly. */}
        <figure className="relative mt-8 lg:mt-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-8 -left-2 font-serif text-[140px] leading-none text-royal-blue/10 select-none lg:-top-14 lg:text-[220px]"
          >
            &ldquo;
          </span>
          <blockquote className="relative max-w-[900px] font-serif text-xl leading-relaxed font-bold text-royal-blue lg:text-[28px] lg:leading-[1.45]">
            {featured.quote}
          </blockquote>
          <figcaption className="relative mt-6 flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-royal-blue/30" />
            <span className="font-sans text-base font-medium text-[#24140d]">{featured.name}</span>
          </figcaption>
        </figure>

        {/* The rest, as supporting evidence. */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {supporting.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col gap-4 rounded-2xl bg-white p-7 transition-shadow duration-300 hover:shadow-lg"
            >
              <blockquote className="font-sans text-base leading-relaxed text-gray-600">
                {t.quote}
              </blockquote>
              <figcaption className="mt-auto font-sans text-sm font-medium text-[#24140d]">
                {t.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
