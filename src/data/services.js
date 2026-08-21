/**
 * The services, with the copy carried over from royalwoodshop.com.
 *
 * Text is the client's own, carried over as they wrote it — headings included.
 * Do not reword it here. If a page needs different words, that is a decision
 * for Royal Wood Shop, not something to make on their behalf while porting.
 *
 * That includes their typos: "material quotation/ estimate" and "volume
 * discount / factory direct price" are spaced exactly as they are on the live
 * site. Flagged with the client rather than silently corrected.
 *
 * Paths keep the addresses WordPress used, so the pages that already rank keep
 * ranking and no redirect is needed:
 *   /consultation, /material-estimate-and-quotation,
 *   /services/delivery, /saw-blade-sharpening
 */

export const services = [
  {
    slug: 'consultation',
    path: '/consultation',
    title: 'Consultation',
    eyebrow: 'Providing consultation on projects of all sizes',
    lead: 'Our team of experts are equipped to answer all of your questions and to offer comprehensive advice backed by years of industry experience.',
    seoTitle: 'Consultation Services',
    seoDescription:
      'Looking for advice on mouldings, doors, railings, or pillars? Royal Wood Shop offers honest consultations to keep you within budget.',
    heading: 'Why Come In For a Consultation?',
    sections: [
      {
        title: 'Expert Advice',
        body: 'Our team of experts are equipped to answer all of your questions and to offer comprehensive advice backed by years of experience. Whether you’re a contractor, a new homebuyer, or a DIYer, we can help to guide you in the right direction.',
      },
      {
        title: 'Quoting',
        body: 'Need a quote for your new mouldings, doors, porch railings, or pillars? The Royal Wood Shop has you covered. We provide honest and reliable quoting that will help you to stay within your project budget. For large builds or renovations, we also offer on-site quoting to determine exactly what you’ll need.',
      },
      {
        title: 'Transparent Delivery Predictions',
        body: 'We know you’re busy and respect honesty. That’s why we never over promise and under deliver. With your project timeline in mind, we’ll be transparent when it comes to delivery schedules and special order fulfillment.',
      },
    ],
    closing: 'Call us at 905-727-1387 or come in-store to discuss your project with us. We’re happy to help!',
  },
  {
    slug: 'material-estimate-and-quotation',
    path: '/material-estimate-and-quotation',
    title: 'Estimate & Quotation',
    eyebrow: 'We’ll determine what you need',
    lead: 'Need an on-site quotation? Our team is available to quote and offer mill-direct pricing on whole house orders and large projects.',
    seoTitle: 'Material Estimate & Quotation',
    seoDescription:
      'Starting a renovation or construction project? Get honest material estimates and on-site quotations from Royal Wood Shop. Contact us today!',
    heading: 'Material Estimate and Quotation Services',
    sections: [
      {
        title: 'On-site Quotation',
        body: 'Unsure where to start? For large projects and full home renovations, a member of our Royal Wood Shop team will head over to your site and help to determine what materials and supplies you’ll need. We’ll also help to measure for trims, doors, and come back to you with a material quotation/ estimate for your build.',
      },
      {
        title: 'Consultation',
        body: 'If you require further consultation or would like to ask our team of experts a question, do not hesitate to visit us in-store or to give us a call. With years of experience under our belt, if we don’t have an answer for you, we’ll be sure to find one.',
        link: { label: 'Read about consultations', to: '/consultation' },
      },
      {
        title: 'Competitive Prices',
        body: 'Whole house renovations or new builds are eligible for a volume discount / factory direct price. Call us at 905-727-1387 for more details.',
      },
    ],
  },
  {
    slug: 'delivery',
    path: '/services/delivery',
    title: 'Delivery Service',
    eyebrow: 'Agile delivery service',
    lead: 'No matter which products or supplies you require for your project, The Royal Wood Shop has your delivery logistics covered and guarantees your delivery order will arrive safely and on time.',
    seoTitle: 'Delivery Service',
    seoDescription:
      'Flexible, reliable delivery of trim, mouldings and interior doors throughout York Region, the GTA and north.',
    heading: 'Agile delivery service',
    highlights: [
      'Cost-effective and convenient',
      'Safe transportation',
      'Quality assurance',
      'Dedicated product driver',
    ],
    sections: [
      {
        title: 'Delivery locations',
        body: 'We provide flexible and reliable delivery throughout York Region, the Greater Toronto Area, Collingwood, Barrie, Muskoka, Haliburton, and more.',
      },
      {
        title: 'Schedule your delivery',
        body: 'The Royal Wood Shop understands that time is money, so let us take care of delivery while you focus on your craft. To learn more, give us a call at 905-727-1387.',
      },
    ],
  },
  {
    slug: 'saw-blade-sharpening',
    path: '/saw-blade-sharpening',
    title: 'Saw Blade Sharpening',
    eyebrow: 'Battling a dull blade?',
    lead: 'Our on-site technician drops off and picks up blades to be sharpened twice per week at FS Tool. Your blades will be sharp, and ready on time for optimal performance.',
    seoTitle: 'Saw Blade Sharpening Service',
    seoDescription:
      'Professional saw blade sharpening at The Royal Wood Shop — table saw, chop saw, dado blades, planer knives, router bits and more.',
    heading: 'Saw blade sharpening service',
    highlightsTitle: 'Blades we sharpen',
    highlights: [
      'Table saw blades',
      'Chop saw blades',
      'Dado blades',
      'Planer knives',
      'Router bits',
      'Hand tools',
      'Band saw blades',
      'Moulder knives',
    ],
    sections: [
      {
        title: 'Why buy a quality FS Tool blade?',
        list: [
          'Application-specific geometry allows for excellent cut quality',
          'Heavier carbide tip allows for more sharpening, producing significant cost savings',
          'High-grade steel body reduces run out for greater cutting accuracy',
          'Superior carbide grade increases run time and extends blade life',
        ],
      },
    ],
    closing: 'We sharpen all brands of knives and blades.',
  },
]

/**
 * All six customer quotes from royalwoodshop.com, verbatim — punctuation and
 * enthusiasm included. An earlier version kept three and tidied two of them;
 * neither was mine to do.
 *
 * `featured` marks the one set as the large pull-quote. Reece's earns it: it is
 * the only quote that describes what the business actually does differently —
 * milling a custom profile and then stocking it.
 */
export const testimonials = [
  {
    name: 'Reece’s',
    featured: true,
    quote: 'When I needed specific mouldings for a project they were happy to work with me to design and produce custom profiles some of which are now standard items in their catalogue. If an item was out of stock I could count on them to promptly schedule a run of that material. This professional and personal service has kept our company as a loyal customer all these many years.',
  },
  {
    name: 'Michael',
    quote: 'I have now gone through 3 complete home renovations, I have purchased flooring, doors, hardware, and of course trim from The Royal Wood Shop. I have had nothing but great experiences from all sides of the company from quality of materials to the staff assisting with and delivering the material. I look forward to my next reno with Royal!',
  },
  {
    name: 'Gallaugher Contracting',
    quote: 'Royal Wood Shop provides great customer service and a wide variety of products. They have knowledgeable staff who help with specific trim related questions. We highly recommend Royal Wood Shop to our clients!',
  },
  {
    name: 'Kevin N',
    quote: 'Friendly staff and willing to help. Huge selection of mouldings in stock; backorders are rare. Royal is our go-to supplier for trim and millwork.',
  },
  {
    name: 'Diane Albin',
    quote: 'Thank you for another wonderful experience shopping at your store!! Your staff is second to none, always very helpful, courteous and patient with a smile. An absolute pleasure!! Please pass along our thanks to the entire staff',
  },
  {
    name: 'Courtney',
    quote: 'Our renovation turned out spectacular! It’s amazing how much of a difference moldings can make. There is a huge selection and lots of staff to help. They stock a lot of nice products you can’t find at other stores.',
  },
]

export const getService = (slug) => services.find((s) => s.slug === slug) ?? null
