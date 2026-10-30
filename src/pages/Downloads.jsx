import { Link } from 'react-router'
import { downloads } from '../data/downloads'
import DownloadList from '../components/DownloadList'

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
          <DownloadList files={downloads} />
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
