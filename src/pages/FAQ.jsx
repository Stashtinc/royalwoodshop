import { useState } from 'react'
import { Link } from 'react-router'

const faqs = [
  {
    question: 'Should I use wood or MDF for painted trim?',
    answer:
      'For painted trim, both Poplar and MDF are excellent choices. MDF paints evenly with minimal telegraphing, is consistent in quality, comes primed-ready, is dimensionally stable, and is cost-effective. Our MDF is CARB Phase 2 compliant and formaldehyde-free. Poplar allows smaller custom orders, is more durable long-term, and nails hold better to walls. Either is a solid choice for a painted finish.',
  },
  {
    question: 'What height of baseboard should I use with an 8-foot ceiling?',
    answer:
      'For standard 8-foot ceilings, 5" to 8" baseboard is recommended. The scale should coordinate with your door and window casing and crown moulding. Older homes typically feature larger baseboards than modern builder homes — don\'t be afraid to go taller for a more traditional look. With higher ceilings, aim for a minimum of 7-1/4" and a maximum of 14".',
  },
  {
    question: 'Why should door and window trim be thicker than the baseboard?',
    answer:
      'Thicker door and window casing creates the correct visual proportion and a sense of architectural elegance — the door "frames" command attention. If upgrading your casing isn\'t in the budget, adding a back-band to the outside edge of your existing casing increases its width and depth for a noticeably richer look without replacing everything.',
  },
  {
    question: 'I need shoe moulding for my new baseboard. Should I use door stop or quarter round?',
    answer:
      'Beyond standard quarter round, door stop and shingle moulding are both popular alternatives. A vintage quarter round profile is also available. Popular stock references include STO-100, STO-102, SHI-002, and QUA-003 — bring your baseboard profile in and our team can recommend what will look best.',
  },
  {
    question: 'How high up the wall should my wainscoting be?',
    answer:
      'Wainscoting can be anywhere from 24" to full ceiling height depending on the look you want to achieve. Traditional wainscoting typically runs to chair-rail height (roughly one-third up the wall, or around 32"–36"). Taller wainscoting, up to 48" or more, creates a more dramatic, formal feel.',
  },
  {
    question: 'Should I use a windowsill and apron on my windows?',
    answer:
      'A windowsill (stool) and apron are not mandatory, but they provide a classic, more dressed look. They work particularly well with architrave trim styles and help balance the proportions of the window — especially when you have taller or wider windows. Whether you use them is largely a matter of style and budget.',
  },
  {
    question: 'My door is too close to an adjacent wall for the casing I want. What should I do?',
    answer:
      'Two solutions work well here. First, you can re-frame the door opening slightly smaller (reducing by 2 inches gives you more room to work with). Second, you can rip down the casing on the tight side so it fits the available space. We don\'t recommend downsizing the casing throughout the entire house just to accommodate one tight spot.',
  },
  {
    question: 'I want to add crown and valance moulding to my kitchen cabinets. What do you carry?',
    answer:
      'We stock a variety of moulding profiles in multiple species suited for cabinet valances and kitchen crown — including profiles that work with inset, overlay, and face-frame cabinet styles. Browse our catalogue online or come in and our staff will help you match a profile to your cabinet style.',
  },
  {
    question: 'I have a transition between hardwood and carpet (or tile). What trim do I need?',
    answer:
      'A universal transition strip typically handles most floor-to-floor transitions. If standard stock options don\'t suit your specific threshold height or gap width, we can often help with custom solutions — or our staff can suggest grouting or ripping down a strip for tile applications.',
  },
  {
    question: 'Does my baseboard need to match my door and window casing?',
    answer:
      'Not strictly, but keep similar lines together. Colonial casing pairs poorly with contemporary baseboard, for example — the profiles will visually conflict. Colonial casing does complement antique or provincial baseboards well. When in doubt, bringing samples into the showroom makes it easy to test combinations side by side.',
  },
  {
    question: 'My chair rail is thicker than my door casing and sticks out past it. How do I fix this?',
    answer:
      'Add a back-band to the outside edge of your door casing. This increases the casing\'s overall depth so it projects further than the chair rail, which is the architecturally correct relationship. It also adds visual width — a win in two ways.',
  },
  {
    question: 'I have 9-foot ceilings and 8-foot doors. Is there enough room for crown moulding?',
    answer:
      'With a standard 96" door and a 9-foot (108") ceiling, you have approximately 12" of wall above the door to the ceiling — which can feel cramped with larger crown profiles. Standard 80" or 84" doors would give you better proportions. If you\'re committed to the 96" door, choose a smaller crown profile (2-1/4" to 3-1/2") and consider whether a frieze or fascia board above the door would help fill the space gracefully.',
  },
  {
    question: 'My walls are non-standard thickness and I need to replace doors. What should I do?',
    answer:
      'Order your prehung doors with the jamb width specified to match your actual wall thickness. If you\'re fitting a new door slab into an existing frame you\'re confident is square and true, measure carefully to standard sizes. Our team can advise on jamb extensions if your wall thickness falls between standard dimensions.',
  },
  {
    question: 'I want to dress up my fireplace with a new mantel and surround. Where do I start?',
    answer:
      'Fireplace surrounds are built up from multiple pieces of moulding and dimensional lumber layered together — there\'s no single piece that does it all. Bring in photos or magazine images of the look you\'re after and our staff will help you identify the profiles and lumber dimensions needed. Pre-built surround kits are also available for gas fireplace applications.',
  },
]

function ChevronIcon({ open }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={`shrink-0 text-royal-blue transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FAQItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  const id = `faq-${index}`

  return (
    <div className={`border-b border-gray-100 ${index === 0 ? 'border-t' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-serif text-base font-bold text-[#24140d] lg:text-[17px]">{question}</span>
        <ChevronIcon open={open} />
      </button>
      <div
        id={id}
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[500px] pb-5' : 'max-h-0'}`}
      >
        <p className="font-sans text-sm leading-relaxed text-gray-600 lg:text-base">{answer}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  return (
    <>
      <section className="w-full border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
            <Link to="/resources" className="transition-colors hover:text-royal-blue">
              Resources
            </Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">FAQ</span>
          </nav>
          <h1 className="font-serif text-3xl leading-tight font-bold text-royal-blue lg:text-[44px]">
            Frequently Asked Questions
          </h1>
          <p className="max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            Common questions about trim, moulding, doors, and installation — answered by our team.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px] lg:gap-16">
            <div className="max-w-[760px]">
              {faqs.map((item, i) => (
                <FAQItem key={i} question={item.question} answer={item.answer} index={i} />
              ))}
            </div>

            <aside className="flex flex-col gap-6 lg:pt-1">
              <div className="rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6">
                <p className="font-serif text-base font-bold text-[#24140d]">Still have a question?</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-gray-600">
                  Our team is in the showroom Monday to Saturday and happy to talk through any project — big or small.
                </p>
                <Link
                  to="/contact"
                  className="mt-4 inline-block rounded-lg border border-royal-blue bg-royal-blue px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
                >
                  Contact us
                </Link>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fbfbfb] p-6">
                <p className="font-serif text-base font-bold text-[#24140d]">Browse our glossary</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-gray-600">
                  Not sure what a term means? Our glossary covers the most common millwork vocabulary.
                </p>
                <Link
                  to="/resources/glossary"
                  className="mt-4 inline-block rounded-lg border border-gray-300 px-5 py-2.5 font-sans text-sm font-medium text-gray-700 transition-colors hover:border-royal-blue hover:text-royal-blue"
                >
                  Glossary of Terms
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="w-full bg-parchment py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">
            Ready to start your project?
          </h2>
          <p className="max-w-[560px] font-sans text-base text-gray-600">
            Visit our showroom or request a quote online — we'll help you select the right materials and get the job done right.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
            >
              Get a Quote
            </Link>
            <Link
              to="/products"
              className="rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
