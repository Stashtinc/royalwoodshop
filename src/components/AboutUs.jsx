import { useState } from 'react'
import { Link } from 'react-router'
import aboutUsImg from '../assets/images/about-us-cover.png'

const youtubeVideoId = 'K6Qf7NK81Bo'

export default function AboutUs() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="about" className="w-full bg-[#fbfbfb] pt-10 pb-10 lg:py-0">
      <div className="flex w-full flex-col items-center gap-8 px-6 lg:flex-row lg:items-center lg:gap-[60px] lg:px-0 lg:pr-8 lg:pl-[191px]">
        <div className="h-[350px] w-full shrink-0 overflow-hidden lg:h-[537px] lg:w-[608px]">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
              title="The Royal Wood Shop"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Play video"
              className="group relative block h-full w-full cursor-pointer overflow-hidden"
            >
              <img
                src={aboutUsImg}
                alt="The Royal Wood Shop showroom"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="ml-1">
                    <path d="M8 4.5L23 14L8 23.5V4.5Z" fill="#0065ab" />
                  </svg>
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-start gap-8 lg:max-w-[600px] lg:pt-12">
          <h2 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            About Us
          </h2>

          <div className="flex flex-col gap-6">
            <p className="font-sans text-xl font-medium text-royal-blue">
              Serving York Region &amp; the Greater Toronto Area since 1982
            </p>
            <p className="font-sans text-lg leading-relaxed text-gray-600">
              The Royal Wood Shop Ltd is a leading specialized supplier of interior trim,
              mouldings, and doors for upscale renovation and new build projects in Toronto,
              GTA and York Region. We take pride in our ability to offer an unmatched
              combination of extensive in-stock selection, custom millwork capability, and
              knowledgeable service—making us the preferred choice for contractors,
              designers, builders, and homeowners who care about detail and quality.
            </p>
          </div>

          <div className="flex flex-wrap gap-7">
            <Link
              to="/contact"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-royal-blue bg-white px-4 py-4 font-sans text-base text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M2 4.5l6 5 6-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
