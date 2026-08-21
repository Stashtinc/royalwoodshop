import { Link } from 'react-router'
import { downloads } from '../data/downloads'

/**
 * Downloads.
 *
 * A short list of files, so the page is a list — not a grid of cards padded
 * out to look substantial. Each row states what the file is, what format it is
 * in, and gives one obvious way to open it.
 *
 * The links open in a new tab: a PDF that replaces the page you were reading
 * loses you the site, and on mobile it can be genuinely hard to get back.
 */

function FileIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-royal-blue"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3H7.4A1.9 1.9 0 0 0 5.5 4.9v14.2A1.9 1.9 0 0 0 7.4 21h9.2a1.9 1.9 0 0 0 1.9-1.9V7.5L14 3Z" />
      <path d="M13.8 3.2V7.6h4.5" />
      <path d="M12 11.4v5.1" />
      <path d="M9.7 14.2 12 16.5l2.3-2.3" />
    </svg>
  )
}

export default function Downloads() {
  return (
    <>
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
            <Link to="/resources" className="transition-colors hover:text-royal-blue">
              Resources
            </Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">Downloads</span>
          </nav>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Downloads
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            Product catalogues and brochures from the ranges we carry, free to download.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <ul className="flex max-w-[900px] flex-col">
            {downloads.map((file, index) => (
              <li
                key={file.slug}
                className={`flex flex-col gap-5 py-8 sm:flex-row sm:items-start sm:gap-7 ${
                  index > 0 ? 'border-t border-gray-100' : 'pt-0'
                }`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fbfbfb]">
                  <FileIcon />
                </span>

                <div className="flex flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-xl font-bold text-[#24140d] lg:text-[24px]">
                      {file.title}
                    </h2>
                    <span className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
                      {file.format}
                    </span>
                  </div>
                  <p className="font-sans text-base leading-relaxed text-gray-600">
                    {file.description}
                  </p>
                </div>

                <a
                  href={file.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark sm:mt-1"
                >
                  Download
                  <span className="sr-only"> {file.title} ({file.format})</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v12" />
                    <path d="m6.8 11.2 5.2 5.2 5.2-5.2" />
                    <path d="M4.5 20h15" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full bg-parchment py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">
            Looking for something that isn&rsquo;t here?
          </h2>
          <p className="max-w-[560px] font-sans text-base text-gray-600">
            Call us at{' '}
            <a href="tel:9057271387" className="font-medium text-royal-blue underline">
              905-727-1387
            </a>{' '}
            or come into the showroom — we can usually put a catalogue in your hands.
          </p>
          <Link
            to="/contact"
            className="mt-1 rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
