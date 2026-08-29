import { useState } from 'react'
import SignaturePad from '../components/SignaturePad'

const RATE = 500
const CAD_RATE = 1.38

const lineItems = [
  {
    step: '1',
    title: 'Clean up the product information',
    who: 'Royal Wood Shop',
    buckets: null,
    noCharge: true,
    bullets: [
      'Supply wood species for 449 products',
      'Confirm four incorrect product dimensions',
      'Confirm two duplicate product records',
      'Decide on 165 products with no description',
    ],
  },
  {
    step: '2',
    title: 'Design front end website',
    who: 'Design — completed',
    completed: true,
    buckets: 1,
    bullets: [
      'Direction and wireframes',
      'Visual design — homepage and key pages',
      'Design system — type, colour, components',
      'Mobile and tablet designs',
    ],
  },
  {
    step: '3',
    title: 'Build the database and the public website',
    who: 'Development — completed',
    completed: true,
    buckets: 2,
    bullets: [
      'Database schema — products, categories, attributes, images',
      'Merge the two divergent data stores into one clean set',
      'Data normalisation — species, dimensions, exceptions',
      'Image pipeline — upload, resize, convert, deliver',
      'Front-end build of the approved designs',
      'Static page and blog migration',
      'Responsive build and accessibility pass',
    ],
  },
  {
    step: '4',
    title: 'Create catalogue (539 products) and advanced search',
    who: 'Development',
    buckets: 2,
    bullets: [
      'Catalogue listing pages',
      'Advanced filtering — species, profile type, dimensions',
      'Individual product detail pages',
      'Site search including product codes',
      'Category and curated landing pages',
    ],
  },
  {
    step: '5',
    title: 'Build the admin screen for staff',
    who: 'Development',
    buckets: 2,
    bullets: [
      'Logins, user accounts and roles',
      'Product create / edit / archive with attribute pickers',
      'Media library and image management',
      'SEO field editing with live preview',
      'Bulk CSV import and export',
      'Redirect manager and 404 log',
    ],
  },
  {
    step: '6',
    title: 'Switch over, with all old links forwarded',
    who: 'Development',
    buckets: 1,
    bullets: [
      '2,148 redirects across four legacy URL patterns, tested',
      'Sitemap generation and structured data',
      'Analytics consolidation — resolve duplicate GTM containers',
      'Pre-launch QA, cutover and DNS',
    ],
  },
  {
    step: '7',
    title: 'Generate product images — AI generated',
    who: 'Design',
    buckets: 2,
    bullets: [
      'AI-generated imagery built from your existing profile drawings and product data',
      'Consistent styling, lighting and background across the whole range',
      'Sized and optimised for web delivery',
      'Covers products with no usable image at present',
      'Royal Wood Shop reviews and approves; anything inaccurate is regenerated',
    ],
  },
  {
    step: '8',
    title: 'Migration and contingency',
    who: 'Development',
    buckets: 2,
    bullets: [
      'Final data migration and verification',
      'Post-launch monitoring (first 30 days)',
      'Staff training and written documentation',
      'Contingency for issues arising from existing data quality',
    ],
  },
]

const optionalItems = [
  { title: 'Ongoing support and maintenance — per month', who: 'Support', buckets: 1 },
  { title: 'SEO support and reporting — per month', who: 'SEO', buckets: 1 },
]

const paymentRows = [
  { milestone: 'On acceptance', trigger: 'Development begins', pct: 0.3, paid: true },
  { milestone: 'Public website and catalogue delivered for review', trigger: 'End of Step 2', pct: 0.3, paid: true },
  { milestone: 'Admin screen delivered for review', trigger: 'End of Step 3', pct: 0.2, due: true },
  { milestone: 'On launch', trigger: 'Site live, redirects verified', pct: 0.2 },
]

const hourlyPeriods = [
  {
    label: 'July 27 – Aug 12',
    hours: 34,
    rate: 65,
    paid: true,
    timesheetUrl: 'https://drive.google.com/file/d/1l3qxq6oATb6KiRKV8YR21Bm0Z5A7ZZg_/view?usp=sharing',
  },
  {
    label: 'Aug 13 – Aug 28',
    hours: 65.4,
    rate: 65,
    paid: false,
    timesheetUrl: 'https://drive.google.com/file/d/1SbVP-0jXlwIldRdxnvhNnmaatde9I5cM/view?usp=sharing',
  },
]


const fmt = (n) => '$' + n.toLocaleString('en-US')

export default function Quotation() {
  const [signedBy, setSignedBy] = useState({ name: 'Brad Gerrits', position: 'The Royal Wood Shop', date: 'Aug 12, 2026' })
  const totalBuckets = lineItems.reduce((s, i) => s + (i.buckets ?? 0), 0)
  const subtotal = totalBuckets * RATE
  const optionalTotal = optionalItems.reduce((s, i) => s + i.buckets * RATE, 0)

  return (
    <div className="min-h-screen w-full bg-[#f7f7f5] py-12 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
              <p className="font-serif text-2xl font-bold text-royal-blue">PROPOSAL & QUOTATION</p>
              <p className="mt-1 max-w-lg font-sans text-sm text-gray-500">
                Website Rebuild — Product Catalogue & Content Management System
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden shrink-0 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-sans text-sm text-gray-600 shadow-sm transition-colors hover:border-royal-blue hover:text-royal-blue"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 5V2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5V5M3 10H2a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 2 5h11a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-1M3.5 8h8v4.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Print
            </button>
          </div>
          <div className="shrink-0 rounded-xl border border-gray-200 bg-white px-5 py-4 text-right font-sans text-sm">
            <div className="flex gap-8">
              <div className="text-left text-gray-400 space-y-1">
                <p>Quote No.</p>
                <p>Date</p>
                <p>Valid until</p>
                <p>Currency</p>
              </div>
              <div className="text-right text-gray-700 space-y-1">
                <p className="font-semibold text-royal-blue">RWS-2026-001</p>
                <p>3 August 2026</p>
                <p>30 September 2026</p>
                <p>USD</p>
              </div>
            </div>
          </div>
        </div>

        {/* From / To */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          {[
            { label: 'FROM', lines: ['Christian Beckermann', '18 Saxon Rd.', 'Barrie, ON L4M 7G9'] },
            { label: 'TO', lines: ['The Royal Wood Shop Ltd', 'Attn: Brad Gerrits', '18237 Woodbine Ave', 'East Gwillimbury, ON L0G 1V0'] },
          ].map(({ label, lines }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="mb-2 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">{label}</p>
              {lines.map((l, i) => (
                <p key={i} className={`font-sans text-sm ${i === 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{l}</p>
              ))}
            </div>
          ))}
        </div>

        {/* Intro */}
        <p className="mb-8 font-sans text-sm leading-relaxed text-gray-600">
          Prepared following the data audit of the existing royalwoodshop.com WordPress installation, completed 30 July 2026.
          Findings and technical detail are set out in the accompanying audit documentation.
        </p>

        {/* Pricing basis */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-royal-blue/20 bg-royal-blue/5 px-5 py-3">
          <p className="font-sans text-sm font-medium text-royal-blue">
            PRICING BASIS — work is priced in fixed units ("buckets").
          </p>
          <p className="font-sans text-sm font-bold text-royal-blue">{fmt(RATE)} USD / bucket</p>
        </div>

        {/* Line items */}
        <div className="mb-2 hidden grid-cols-[2rem_1fr_8rem_5rem_5rem_5.5rem] gap-x-4 px-4 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase sm:grid">
          <span>Step</span>
          <span>What happens</span>
          <span>Who</span>
          <span className="text-right">Buckets</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="mb-8 flex flex-col gap-3">
          {lineItems.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="grid grid-cols-[2rem_1fr] gap-x-4 sm:grid-cols-[2rem_1fr_8rem_5rem_5rem_5.5rem]">
                <span className="font-sans text-sm font-bold text-royal-blue">{item.step}</span>
                <div>
                  <p className="font-sans text-sm font-semibold text-gray-800">{item.title}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {item.bullets.map((b, i) => (
                      <li key={i} className="font-sans text-xs text-gray-400 before:mr-1.5 before:content-['–']">{b}</li>
                    ))}
                  </ul>
                </div>
                <span className={`hidden font-sans text-sm sm:block ${item.completed ? 'font-semibold text-emerald-600' : item.inProgress ? 'font-semibold text-amber-500' : 'text-gray-500'}`}>
                  {item.who}
                </span>
                <span className="hidden text-right font-sans text-sm text-gray-700 sm:block">
                  {item.noCharge ? '—' : item.buckets}
                </span>
                <span className="hidden text-right font-sans text-sm text-gray-400 sm:block">
                  {item.noCharge ? '—' : fmt(RATE)}
                </span>
                <span className={`hidden text-right font-sans text-sm font-semibold sm:block ${item.noCharge ? 'text-gray-400' : 'text-gray-800'}`}>
                  {item.noCharge ? 'No charge' : fmt(item.buckets * RATE)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Hourly rate note */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 font-sans text-sm text-amber-900">
          <p className="font-semibold">Hourly time billed separately</p>
          <p className="mt-1 text-amber-700">
            Any time outside the fixed bucket scope is billed at{' '}
            <span className="font-semibold">$85 CAD / hr</span> (standard rate), with a friend discount applied bringing it to{' '}
            <span className="font-semibold">$65 CAD / hr</span> for The Royal Wood Shop. Hourly time is invoiced at the end of each billing period with a timesheet.
          </p>
        </div>

        {/* Totals */}
        <div className="mb-10 flex justify-end">
          <div className="w-full max-w-xs rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex justify-between px-5 py-3 font-sans text-sm text-gray-500">
              <span>Total buckets</span>
              <span className="font-medium text-gray-700">{totalBuckets}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 px-5 py-3 font-sans text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium text-gray-700">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 px-5 py-3 font-sans text-sm text-gray-400">
              <span>Tax</span>
              <span>—</span>
            </div>
            <div className="flex justify-between border-t border-royal-blue/20 bg-royal-blue px-5 py-3.5 font-sans text-sm font-bold text-white">
              <span>TOTAL (USD)</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-royal-blue/40 bg-royal-blue/90 px-5 py-3 font-sans text-sm text-white/80">
              <span>≈ CAD <span className="text-xs font-normal opacity-70">(@ {CAD_RATE} rate)</span></span>
              <span className="font-semibold">${Math.round(subtotal * CAD_RATE).toLocaleString('en-CA')} CAD</span>
            </div>
          </div>
        </div>

        {/* Optional items */}
        <div className="mb-10">
          <p className="mb-3 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">
            Optional — not included in the total above
          </p>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {optionalItems.map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between gap-4 px-5 py-3.5 font-sans text-sm ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="min-w-0">
                  <span className="text-gray-700">{item.title}</span>
                  <span className="ml-3 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">{item.who}</span>
                </div>
                <div className="flex shrink-0 items-center gap-6 text-right">
                  <span className="text-gray-400">{item.buckets} {item.buckets === 1 ? 'bucket' : 'buckets'}</span>
                  <span className="w-16 font-semibold text-gray-700">{fmt(item.buckets * RATE)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 font-sans text-sm font-semibold text-gray-700">
              <span>Optional total</span>
              <span>{fmt(optionalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment schedule */}
        <div className="mb-10">
          <p className="mb-3 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">Payment Schedule</p>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {paymentRows.map((row, idx) => (
              <div key={idx} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 font-sans text-sm ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-700">{row.milestone}</p>
                    {row.paid && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-xs font-semibold text-emerald-600">Paid</span>
                    )}
                    {row.due && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-sans text-xs font-semibold text-red-600">Due</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{row.trigger}</p>
                </div>
                <span className="text-gray-400">{Math.round(row.pct * 100)}%</span>
                <span className="w-16 text-right font-semibold text-gray-700">{fmt(subtotal * row.pct)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-t border-gray-200 bg-gray-50 px-5 py-3 font-sans text-sm font-semibold text-gray-700">
              <span>Total</span>
              <span className="text-gray-400">100%</span>
              <span className="w-16 text-right">{fmt(subtotal)}</span>
            </div>
          </div>
        </div>

        {/* Hourly time summary */}
        <div className="mb-10 overflow-hidden rounded-xl border border-gray-200">
          <p className="border-b border-gray-100 bg-gray-50 px-5 py-3 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">
            Hourly Time — $65 CAD / hr
          </p>
          {hourlyPeriods.map((period) => {
            const amount = Math.round(period.hours * period.rate)
            return (
              <div key={period.label} className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 font-sans text-sm last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-gray-700 font-medium">{period.label}</span>
                  <span className="text-gray-400">{period.hours} hrs @ ${period.rate}</span>
                  {period.timesheetUrl && (
                    <a
                      href={period.timesheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-royal-blue underline underline-offset-2 hover:text-royal-blue-dark"
                    >
                      View timesheet →
                    </a>
                  )}
                  {period.paid
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">Paid</span>
                    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Due</span>
                  }
                </div>
                <span className={`shrink-0 font-semibold ${period.paid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {fmt(amount)} <span className="font-normal text-gray-400 text-xs">CAD</span>
                </span>
              </div>
            )
          })}
          {(() => {
            const due = hourlyPeriods.filter(p => !p.paid)
            if (!due.length) return null
            const dueTotal = due.reduce((s, p) => s + Math.round(p.hours * p.rate), 0)
            return (
              <div className="flex items-center justify-between border-t-2 border-amber-200 bg-amber-50 px-5 py-3.5 font-sans text-sm font-bold text-amber-900">
                <span>Hourly balance due</span>
                <span>{fmt(dueTotal)} <span className="font-normal text-amber-700 text-xs">CAD</span></span>
              </div>
            )
          })()}
        </div>

        {/* Payment Summary */}
        <div className="mb-10 overflow-hidden rounded-xl border border-gray-200">
          <p className="border-b border-gray-100 bg-gray-50 px-5 py-3 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">
            Payment Summary
          </p>

          {/* Fixed milestone payments */}
          {paymentRows.filter(r => r.paid).map((row) => (
            <div key={row.milestone} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 font-sans text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{row.milestone}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">Paid</span>
              </div>
              <span className="font-semibold text-gray-400 line-through">{fmt(subtotal * row.pct)} <span className="font-normal text-gray-400 text-xs">USD</span></span>
            </div>
          ))}

          {/* Paid hourly periods */}
          {hourlyPeriods.filter(p => p.paid).map((period) => (
            <div key={period.label} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 font-sans text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Hourly — {period.label} ({period.hours} hrs)</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">Paid</span>
              </div>
              <span className="font-semibold text-gray-400 line-through">{fmt(Math.round(period.hours * period.rate))} <span className="font-normal text-gray-400 text-xs">CAD</span></span>
            </div>
          ))}

          {/* Paid total */}
          <div className="flex items-center justify-between border-t-2 border-emerald-200 bg-emerald-50 px-5 py-4 font-sans text-sm font-bold text-emerald-800">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Paid to date</span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-700">{fmt(paymentRows.filter(r => r.paid).reduce((s, r) => s + subtotal * r.pct, 0))} <span className="font-normal text-emerald-600 text-xs">USD</span></p>
              <p className="font-semibold text-emerald-700">+ {fmt(hourlyPeriods.filter(p => p.paid).reduce((s, p) => s + Math.round(p.hours * p.rate), 0))} <span className="font-normal text-emerald-600 text-xs">CAD</span></p>
            </div>
          </div>

          {/* Due: milestone payments */}
          {paymentRows.filter(r => r.due).map((row) => (
            <div key={row.milestone} className="flex items-center justify-between border-t border-amber-100 bg-amber-50/60 px-5 py-3.5 font-sans text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-900">{row.milestone}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Due</span>
              </div>
              <span className="font-bold text-amber-900">{fmt(subtotal * row.pct)} <span className="font-normal text-amber-700 text-xs">USD</span></span>
            </div>
          ))}

          {/* Due: hourly periods */}
          {hourlyPeriods.filter(p => !p.paid).map((period) => (
            <div key={period.label} className="flex items-center justify-between border-t border-amber-100 bg-amber-50/60 px-5 py-3.5 font-sans text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-900">Hourly — {period.label} ({period.hours} hrs @ ${period.rate})</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Due</span>
              </div>
              <span className="font-bold text-amber-900">{fmt(Math.round(period.hours * period.rate))} <span className="font-normal text-amber-700 text-xs">CAD</span></span>
            </div>
          ))}

          {/* Grand total due */}
          {(() => {
            const dueMilestones = paymentRows.filter(r => r.due)
            const dueHourly = hourlyPeriods.filter(p => !p.paid)
            if (!dueMilestones.length && !dueHourly.length) return null
            const dueUSD = dueMilestones.reduce((s, r) => s + subtotal * r.pct, 0)
            const dueCAD = dueHourly.reduce((s, p) => s + Math.round(p.hours * p.rate), 0)
            return (
              <div className="flex items-center justify-between border-t-2 border-amber-300 bg-amber-100 px-5 py-4 font-sans font-bold text-amber-900">
                <span className="text-base">Total Due Now</span>
                <div className="text-right">
                  {dueUSD > 0 && <p className="text-base">{fmt(dueUSD)} <span className="text-xs font-normal text-amber-700">USD</span></p>}
                  {dueCAD > 0 && <p className="text-base">{fmt(dueCAD)} <span className="text-xs font-normal text-amber-700">CAD</span></p>}
                </div>
              </div>
            )
          })()}

          {/* Next upcoming milestone (not yet due) */}
          {(() => {
            const next = paymentRows.find(r => !r.paid && !r.due)
            if (!next) return null
            return (
              <div className="flex items-center justify-between border-t border-royal-blue/20 bg-royal-blue/5 px-5 py-4 font-sans text-sm">
                <div>
                  <p className="font-semibold text-royal-blue">Next Milestone</p>
                  <p className="mt-0.5 text-xs text-gray-500">{next.trigger}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{next.milestone}</p>
                </div>
                <p className="font-bold text-royal-blue">{fmt(subtotal * next.pct)} <span className="text-xs font-normal text-gray-400">USD</span></p>
              </div>
            )
          })()}
        </div>

        {/* Acceptance — hidden once signed; the sticky band below carries the record */}
        {!signedBy && (
          <div className="mb-16 rounded-xl border border-gray-200 bg-white px-5 py-6">
            <p className="mb-1 font-sans text-xs font-bold tracking-widest text-gray-400 uppercase">Acceptance</p>
            <p className="mb-6 font-sans text-sm text-gray-500">
              Signing below confirms acceptance of this quotation.
            </p>
            <SignaturePad onAccepted={setSignedBy} />
          </div>
        )}

      </div>

      {/* Sticky signed bar */}
      {signedBy && (
        <div className="print:hidden fixed bottom-0 inset-x-0 z-50 border-t border-emerald-200 bg-emerald-50 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-sans text-sm text-emerald-800">
                Signed by <strong>{signedBy.name}</strong>{signedBy.position ? `, ${signedBy.position}` : ''} · {signedBy.date}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 5V2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5V5M3 10H2a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 2 5h11a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-1M3.5 8h8v4.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
