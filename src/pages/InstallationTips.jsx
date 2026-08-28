import { Link } from 'react-router'

const tips = [
  {
    id: 'what-am-i-nailing-to',
    heading: 'What Am I Nailing To?',
    body: `Crown moulding typically attaches to framed stud walls. Studs are generally 16" on centre for 2×4 walls and 24" on centre for 2×6 walls.

Use a stud finder — switch to the "deep scan" setting if you're working on older lathe-and-plaster surfaces. Drywall screw indentations along the wall are another reliable indicator of stud positions. Once you locate one stud centre, measure outward at 16" or 24" intervals to find the rest.

When nailing along the top plate (the horizontal framing member at ceiling height), use 2" or longer finishing nails positioned more than 2.5" below the ceiling. For smaller profiles with a rise of 3" or less, nailing directly into the top plate eliminates the need to mark studs at all.`,
  },
  {
    id: 'what-am-i-nailing-with',
    heading: 'What Am I Nailing With?',
    body: `Crown moulding typically requires a 2" finishing nail, a compressor, and a finishing gun. For outside corners, use a brad nailer with 1" brad nails and a quality carpenter's adhesive.

When nailing into the face of the moulding, aim for the prominent (raised) profile areas rather than the recessed sections — this makes filling nail holes easier and produces a cleaner finished result.`,
  },
  {
    id: 'how-much-do-i-need',
    heading: 'How Much Crown Moulding Do I Need?',
    body: `Measure each run individually and round up to the nearest foot to accommodate cuts and adjustments. Mouldings are available in lengths from 3' to 16'.

When calculating mitre cuts, remember that the cut consumes material — account for the width of the moulding piece itself when determining the length needed for the mitre. For rooms with inside and outside corners, always buy 10–15% extra to allow for test cuts and waste.`,
  },
  {
    id: 'how-do-i-apply-filler',
    heading: 'How Do I Apply Filler?',
    body: `Sand any affected areas lightly before applying filler. Use a non-shrinking filler and follow the manufacturer's guidelines. For stainable products, select a filler that matches the wood colour as closely as possible.

After the filler dries, lightly sand the area smooth before priming or painting. For stained wood, use a wax-based filler crayon — apply it after the stain has fully dried, since stain cannot penetrate over wax.`,
  },
  {
    id: 'size-selection',
    heading: 'Choosing the Right Size',
    body: `Crown moulding is available in sizes ranging from 2-1/4" to 7-1/4". As a general rule, pair ceiling height with crown width — taller ceilings accommodate and benefit from wider profiles.

For standard 8-foot ceilings, a 3-1/2" to 4-1/2" crown is typical. Ceilings of 9 to 10 feet suit a 4-1/2" to 6" profile. For cathedral or vaulted ceilings above 10 feet, consider profiles in the 5-1/2" to 7-1/4" range. Bringing a sample home to hold up in the actual space is the best way to confirm the scale feels right before you commit.`,
  },
  {
    id: 'wood-vs-mdf',
    heading: 'Wood vs. MDF',
    body: `MDF (medium-density fiberboard) is recycled wood fibre compressed under high pressure and heat. It's available primed in 14- or 16-foot lengths only, and is an excellent choice for painted applications — it produces a very smooth, consistent finish with no grain telegraphing.

Wood mouldings are available in varied lengths up to 16 feet and offer a kiln-dried moisture content of 6–12%. They come in natural or pre-primed finishes and are the right choice when you want a stained result or need to nail into tight or delicate locations (wood holds a nail more firmly than MDF near an edge).`,
  },
  {
    id: 'tools-required',
    heading: 'Tools Required',
    body: `A standard crown moulding installation calls for:

• Power miter saw (the most critical tool)
• Coping saw (for coped inside corners)
• Chalk line (useful when ceilings are not perfectly level)
• Drill/driver for pre-drilling into hardwood or near edges
• Hammer and nailset, or a pneumatic finishing gun
• Carpenter's glue for corner joints
• Wood putty or filler for nail holes
• Paint or stain to match the finished surface`,
  },
  {
    id: 'cutting-methods',
    heading: 'Cutting Methods: In-Position vs. Flat',
    body: `There are two standard approaches to cutting crown moulding:

**In-Position Method**
Place the moulding at the correct spring angle (against the fence at the top, against the table at the bottom) and cut using only the mitre setting. For a 90-degree inside corner, set the mitre to 45 degrees. This approach is more intuitive for beginners and makes measuring the cut length easier — but the moulding must be held perfectly steady, and the saw must have the throat capacity to accommodate the profile.

**Flat Method**
Lay the moulding flat on the saw table and use a compound cut (both mitre and bevel settings applied simultaneously). This is more precise since the piece sits firmly on the table with no risk of shifting, but it requires careful tracking of which edge contacts the fence and which way the profile should face. Most compound mitre saw manufacturers publish the correct angle settings for standard spring angles.`,
  },
  {
    id: 'curved-walls',
    heading: 'Curved Walls',
    body: `Standard rigid moulding cannot flex around curved walls. For gentle curves, Ultra-Flex moulding is an excellent option — it machines like wood, accepts paint and stain like wood, and can be bent to radius on site.

For tighter or architectural curves, curved crown moulding must be factory pre-formed. You'll need to provide the manufacturer with the radius of the curve, whether it is concave or convex (inside or outside curve), and which face mounts to the wall. Lead times for factory-formed curved crown are typically 4–6 weeks, so plan ahead.`,
  },
  {
    id: 'bevel-vs-mitre',
    heading: 'Understanding Bevel vs. Mitre',
    body: `These two terms describe different adjustments on a mitre saw, and knowing the difference prevents costly cut errors:

**Mitre** refers to rotating the saw arm horizontally on the table — moving the blade side to side relative to the fence. This is the cut used for corners in plan view (turning a corner on the floor).

**Bevel** refers to tilting the saw blade away from vertical — moving the blade side to side through its height. This is the cut used for spring angles when laying moulding flat on the saw.

Crown moulding cut in-position uses only mitre. Crown cut flat on the saw uses a compound of both mitre and bevel simultaneously.`,
  },
]

function TipIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-royal-blue"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function TipBody({ text }) {
  // Render lines separated by blank lines as paragraphs; bullet lines as list items
  const blocks = text.split('\n\n')
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.startsWith('•'))) {
          return (
            <ul key={i} className="flex flex-col gap-1.5 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex items-start gap-2 font-sans text-sm leading-relaxed text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-royal-blue" />
                  <span>{l.replace(/^•\s*/, '')}</span>
                </li>
              ))}
            </ul>
          )
        }
        // Bold lines (start with **)
        if (block.startsWith('**')) {
          const formatted = block.replace(/\*\*(.+?)\*\*/g, '<span class="font-bold text-[#24140d]">$1</span>')
          return (
            <p
              key={i}
              className="font-sans text-sm leading-relaxed text-gray-600"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          )
        }
        return (
          <p key={i} className="font-sans text-sm leading-relaxed text-gray-600">
            {block}
          </p>
        )
      })}
    </div>
  )
}

export default function InstallationTips() {
  return (
    <>
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
            <Link to="/resources" className="transition-colors hover:text-royal-blue">
              Resources
            </Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">Installation Tips</span>
          </nav>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Installation Tips
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            Practical guidance for installing crown moulding and interior trim — from choosing materials to making the right cuts.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">

            {/* Sticky sidebar nav */}
            <nav aria-label="Jump to section" className="hidden lg:block">
              <ul className="sticky top-28 flex flex-col gap-1">
                {tips.map((tip) => (
                  <li key={tip.id}>
                    <a
                      href={`#${tip.id}`}
                      className="block rounded-lg px-3 py-2 font-body text-sm text-gray-500 transition-colors hover:bg-parchment hover:text-royal-blue"
                    >
                      {tip.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Tips */}
            <div className="flex flex-col gap-12">
              {tips.map((tip, i) => (
                <article
                  key={tip.id}
                  id={tip.id}
                  className={`flex flex-col gap-4 ${i > 0 ? 'border-t border-gray-100 pt-12' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-royal-blue/8">
                      <TipIcon />
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#24140d] lg:text-2xl">
                      {tip.heading}
                    </h2>
                  </div>
                  <div className="pl-11">
                    <TipBody text={tip.body} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-parchment py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">
            Need help planning your installation?
          </h2>
          <p className="max-w-[560px] font-sans text-base text-gray-600">
            Bring your measurements and photos to our showroom — our team can recommend the right profiles, quantities, and tools for your project.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
            >
              Visit the Showroom
            </Link>
            <Link
              to="/resources/faq"
              className="rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
            >
              Browse FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
