import { Link } from 'react-router'

const terms = [
  {
    term: 'Architrave',
    definition:
      'An architrave moulding is sometimes called a door header. It is the top horizontal trim piece over the door.',
  },
  {
    term: 'Back Band',
    definition:
      'Back band is a decorative trim that is added to the outside edge of the casing to offer more depth and width.',
  },
  {
    term: 'Baseboard',
    definition:
      'The baseboard ties the wall and floor together offering a visual foundation. It protects the walls from bumps and cleaning.',
  },
  {
    term: 'Base Cap',
    definition:
      'A base cap is used as a decorative piece that is placed on top of a dimensional board at the floor to create a two-piece baseboard.',
  },
  {
    term: 'Bed Mould',
    definition: 'A bed mould is similar to a crown or cornice mould but smaller in size.',
  },
  {
    term: 'Brick Mould',
    definition:
      'Brick moulding is an exterior casing for doors and windows. It is quite thick and allows siding or brick to butt up against it.',
  },
  {
    term: 'Burlap',
    definition: 'Burlaps are often used to cover the joining line between two parallel flush surfaces.',
  },
  {
    term: 'Cap Mould',
    definition: 'A cap mould is a generic term for a moulding that is designed to cap something off.',
  },
  {
    term: 'Casing',
    definition:
      'Casing is used to trim around doors and windows. It covers the gap between the drywall and the jamb.',
  },
  {
    term: 'Casing Build Up',
    definition:
      'A casing build up is two or more pieces of moulding put together to get a more custom look without the costs.',
  },
  {
    term: 'Chair Rail',
    definition:
      'Chair Rail is applied on the wall parallel to the crown and base. Often it is installed approximately one-third the distance up the wall.',
  },
  {
    term: 'Corner Blocks',
    definition:
      'Corner blocks are often referred to as rosettes and are decorative blocks placed in the top corners of the door and window casing.',
  },
  {
    term: 'Cove Mould',
    definition:
      'Cove mould is an inside corner concave in shape and comes in various sizes depending on the application.',
  },
  {
    term: 'Crown Mould',
    definition:
      'Crown moulding is applied where the ceiling and wall meet to offer a dramatic and elegant look to a room.',
  },
  {
    term: 'Decorative Mould',
    definition: 'Decorative mouldings are used for various decorative applications in all aspects of millwork.',
  },
  {
    term: 'Door Jamb',
    definition:
      'Door Jamb is the square wood frame around the three sides of the door or four sides of a window.',
  },
  {
    term: 'Door Stop',
    definition: 'Doorstop is applied to door jambs to stop the door from swinging in the wrong direction.',
  },
  {
    term: 'Fluted Moulding',
    definition:
      'A fluted moulding is often a wider and symmetrical casing with vertical flutes cut into it.',
  },
  {
    term: 'Half Round',
    definition: 'Half round has a 180-degree half circle profile and has many applications in millwork.',
  },
  {
    term: 'Handrail',
    definition: 'Hand railing is used as a safety rail for support in a stairwell.',
  },
  {
    term: 'Keystone',
    definition:
      'A keystone is an architectural accessory that is placed in the centre of the architrave over doors and windows.',
  },
  {
    term: 'Nosing',
    definition:
      'A nosing is often used at the top step and landing of stairwells. It is the part that projects past the vertical riser.',
  },
  {
    term: 'Outside Corner Mould',
    definition: 'An outside corner mould is used to protect an outside corner as an outside corner guard.',
  },
  {
    term: 'Panel Mould',
    definition: 'Panel mould is a decorative trim applied to the wall to add a visual relief to the wall.',
  },
  {
    term: 'Plinth Block',
    definition:
      'Plinth blocks are another accessory similar to corner blocks, only they are placed at the bottom of the door casing.',
  },
  {
    term: 'Quarter Round',
    definition:
      'Quarter round moulding is a 90-degree inside corner moulding often used for shoe mould or any application where two adjacent surfaces meet.',
  },
  {
    term: 'Shingle Mould',
    definition:
      'A shingle moulding is another decorative moulding that can be used for many design applications.',
  },
  {
    term: 'Shoe Mould',
    definition:
      'Shoe moulding is used where the floor and the baseboard meet. It is often referred to as quarter round.',
  },
  {
    term: 'Stair Riser',
    definition: 'The riser is the vertical portion of the staircase.',
  },
  {
    term: 'Stair Spindle',
    definition:
      'A spindle is commonly referred to as a baluster. Spindles & balusters are the vertical supports that tie the handrail to the staircase.',
  },
  {
    term: 'Stair Tread',
    definition: 'The stair tread is the actual stair step you walk up the stairs on.',
  },
  {
    term: 'Threshold',
    definition:
      'A threshold is used at the bottom of an exterior door between the jambs. It covers two different floor coverings or to close a gap.',
  },
  {
    term: 'Transition Strip',
    definition:
      'A transition strip helps transition two different flooring surfaces together and hides any rough or irregular seams.',
  },
  {
    term: 'Wainscoting',
    definition:
      'Wainscoting is used as a decorative relief applied to wall surfaces usually between the chair rail and the baseboard.',
  },
  {
    term: 'Window Sill / Stool',
    definition:
      'The sill or stool is the bottom portion of a window. It projects past the casing and a skirt or apron moulding is used underneath.',
  },
]

// Group terms by first letter
const grouped = terms.reduce((acc, t) => {
  const letter = t.term[0].toUpperCase()
  if (!acc[letter]) acc[letter] = []
  acc[letter].push(t)
  return acc
}, {})

const letters = Object.keys(grouped).sort()

export default function Glossary() {
  return (
    <>
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
            <Link to="/resources" className="transition-colors hover:text-royal-blue">
              Resources
            </Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">Glossary of Terms</span>
          </nav>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Glossary of Terms
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            A plain-language reference for the millwork and trim terms you'll encounter in our showroom, catalogues, and on the job site.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          {/* Letter index */}
          <div className="mb-10 flex flex-wrap gap-2">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 font-body text-sm font-bold text-gray-600 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
              >
                {letter}
              </a>
            ))}
          </div>

          {/* Terms by letter */}
          <div className="flex flex-col gap-12">
            {letters.map((letter) => (
              <div key={letter} id={`letter-${letter}`}>
                <div className="mb-6 flex items-center gap-4">
                  <span className="font-serif text-3xl font-bold text-royal-blue">{letter}</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <dl className="grid grid-cols-1 gap-px bg-gray-100 overflow-hidden rounded-2xl border border-gray-100 lg:grid-cols-2">
                  {grouped[letter].map((entry) => (
                    <div key={entry.term} className="flex flex-col gap-2 bg-white p-6">
                      <dt className="font-serif text-base font-bold text-[#24140d]">{entry.term}</dt>
                      <dd className="font-sans text-sm leading-relaxed text-gray-600">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-parchment py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">
            Have a question about a specific product?
          </h2>
          <p className="max-w-[560px] font-sans text-base text-gray-600">
            Our team is happy to walk you through terminology and help you find exactly what your project needs.
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
