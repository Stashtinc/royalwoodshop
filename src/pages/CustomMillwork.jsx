import { Crumb, ServiceCta } from '../components/service/ServiceShell'
import customMillworkImage from '../assets/images/custom-millwork.png'

/**
 * Custom Millwork.
 *
 * Replaces the All Services page. The hero follows the service pages: the title and
 * its lead on blue, the photograph alongside. The copy is the client's.
 */

// Project photos for the masonry wall. Each keeps its own proportions, so the
// columns stagger between portrait and landscape.
const MASONRY_PHOTOS = [
  { src: '/images/custom-millwork/mw-01-hallway-console.jpg', w: 1384, h: 1400, alt: 'Painted hallway with raised-panel trim, pilasters and a corner cove' },
  { src: '/images/custom-millwork/mw-02-wall-panelling.jpg', w: 1400, h: 933, alt: 'White wall panelling with raised panels in a hallway' },
  { src: '/images/custom-millwork/mw-03-profiles-drawings.jpg', w: 1400, h: 936, alt: 'Hardwood mouldings beside shop drawings' },
  { src: '/images/custom-millwork/mw-04-primed-oak-trim.jpg', w: 1400, h: 1179, alt: 'Primed and oak fluted trim packs ready to ship' },
  { src: '/images/custom-millwork/mw-05-oak-door-detail.jpg', w: 1400, h: 1050, alt: 'Close-up of a machined oak door panel with a raised profile' },
  { src: '/images/custom-millwork/mw-06-glazed-door.jpg', w: 1050, h: 1400, alt: 'Glazed interior door with a diamond muntin pattern' },
  { src: '/images/custom-millwork/mw-07-arch-door.jpg', w: 1236, h: 1400, alt: 'Oak arched-panel door' },
  { src: '/images/custom-millwork/mw-08-header-cap.jpg', w: 1050, h: 1400, alt: 'Layered header cap moulding' },
  { src: '/images/custom-millwork/mw-09-curved-window-template.jpg', w: 1400, h: 1050, alt: 'Curved moulding laid out against a quarter-round window template' },
  { src: '/images/custom-millwork/mw-10-curved-oak-moulding.jpg', w: 1400, h: 1050, alt: 'Bent oak curved moulding' },
  { src: '/images/custom-millwork/mw-11-white-oak-board.jpg', w: 1188, h: 1400, alt: 'White oak board, machined for a profile' },
]

export default function CustomMillwork() {
  return (
    <>
      <section className="w-full bg-royal-blue">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[1fr_42%]">
          <div className="flex flex-col justify-center gap-5 px-6 py-16 lg:py-24 lg:pl-[max(2rem,calc((100vw-1280px)/2))] lg:pr-14">
            <Crumb title="Custom Millwork" onBlue />
            <h1 className="font-serif text-3xl leading-tight font-bold text-white lg:text-[44px]">
              Custom Trim &amp; Mouldings
            </h1>
            <p className="max-w-[540px] font-sans text-lg leading-relaxed text-white/80">
              The profile you need. Even when it isn&rsquo;t on the shelf.
            </p>
          </div>
          <div className="relative min-h-[260px] lg:min-h-[480px]">
            <img
              src={customMillworkImage}
              alt="Oak door with a raised-panel profile, machined and finished in the shop"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            Can&rsquo;t find the right Design? Royal Wood Shop can help reproduce hardwood moulding profiles and
            made-to-order interior doors for projects requiring specific dimensions, species or architectural details.
          </p>
          <p className="font-sans text-lg leading-relaxed text-gray-600">
            From matching original trim in a renovation to coordinating custom mouldings and doors for a new home,
            our team helps turn your drawings, samples and specifications into the finished materials your project
            requires.
          </p>
        </div>

        {/* Project photos in a masonry wall: CSS columns, so each photo keeps its own shape. */}
        <div className="mx-auto mt-16 max-w-[1100px] px-6 lg:px-8">
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {MASONRY_PHOTOS.map((photo) => (
              <img
                key={photo.src}
                src={photo.src}
                width={photo.w}
                height={photo.h}
                alt={photo.alt}
                loading="lazy"
                className="mb-4 w-full break-inside-avoid rounded-xl"
              />
            ))}
          </div>
        </div>
      </section>

      <ServiceCta />
    </>
  )
}
