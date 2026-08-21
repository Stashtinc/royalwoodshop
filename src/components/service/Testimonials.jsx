import { useState } from 'react'
import { testimonials } from '../../data/services'

/**
 * One customer quote at a time, with controls to move between them.
 *
 * All six quotes are worth showing but they are wildly uneven in length —
 * Kevin N's is two lines, Reece's is five — so the quote area holds a minimum
 * height. Without it the section jumps by a hundred pixels between slides,
 * which drags the rest of the page up and down as you read.
 *
 * No auto-advance. A quote that slides away mid-sentence is the most reliable
 * way to make someone stop reading it.
 */

export default function Testimonials({ eyebrow = 'Testimonial' }) {
  const [index, setIndex] = useState(0)
  const current = testimonials[index]

  const go = (next) => setIndex((next + testimonials.length) % testimonials.length)

  return (
    <section className="w-full bg-parchment py-16 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <p className="font-sans text-sm font-bold tracking-wide text-royal-blue uppercase">
          {eyebrow}
        </p>

        <div
          className="relative mt-8 lg:mt-10"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') go(index - 1)
            if (e.key === 'ArrowRight') go(index + 1)
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-8 -left-2 font-serif text-[140px] leading-none text-royal-blue/10 select-none lg:-top-14 lg:text-[220px]"
          >
            &ldquo;
          </span>

          {/* aria-live so the quote is announced when it changes, and a floor
              on the height so the page does not jump between slides. */}
          <figure
            aria-live="polite"
            className="relative flex min-h-[210px] flex-col justify-center lg:min-h-[240px]"
          >
            <blockquote className="max-w-[940px] font-serif text-xl leading-relaxed font-bold text-royal-blue lg:text-[28px] lg:leading-[1.45]">
              {current.quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span aria-hidden className="h-px w-10 bg-royal-blue/30" />
              <span className="font-sans text-base font-medium text-[#24140d]">{current.name}</span>
            </figcaption>
          </figure>

          {/* Controls */}
          <div className="mt-10 flex items-center justify-between gap-6 border-t border-royal-blue/15 pt-6">
            <div className="flex items-center gap-2.5">
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show the quote from ${t.name}`}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index ? 'w-8 bg-royal-blue' : 'w-2 bg-royal-blue/25 hover:bg-royal-blue/50'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="font-sans text-sm text-gray-500 tabular-nums">
                {index + 1} / {testimonials.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous quote"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-royal-blue/25 text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
                >
                  <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next quote"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-royal-blue/25 text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
                >
                  <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
