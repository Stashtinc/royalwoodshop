import { Link } from 'react-router'

// ─── Helpers ────────────────────────────────────────────────────────────────

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-gray-100 py-14">
      <h2 className="mb-8 font-serif text-2xl font-bold text-coffee-bean">{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ name, token, hex, textClass = 'text-white' }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 shadow-sm">
      <div className={`flex h-20 items-end p-3 ${token}`}>
        <span className={`font-sans text-xs font-semibold ${textClass}`}>{hex}</span>
      </div>
      <div className="bg-white px-3 py-2.5">
        <p className="font-sans text-sm font-semibold text-tundora">{name}</p>
        <p className="font-sans text-xs text-gray-400">{token.replace('bg-', '')}</p>
      </div>
    </div>
  )
}

function TypeSpec({ label, className, sample }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-gray-100 py-5 first:border-0 first:pt-0">
      <p className="font-sans text-xs font-semibold tracking-wide text-gray-400 uppercase">{label}</p>
      <p className={className}>{sample}</p>
    </div>
  )
}

function CodeBlock({ children }) {
  return (
    <code className="block rounded-lg bg-gray-50 px-4 py-2 font-mono text-xs text-gray-600 whitespace-pre">
      {children}
    </code>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DesignSystem() {
  return (
    <>
      {/* Page header */}
      <div className="border-b border-gray-100 bg-[#fbfbfb] py-12 lg:py-16">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 font-sans text-sm text-gray-500">
            <span className="text-gray-700">Design System</span>
          </nav>
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[44px]">Design System</h1>
          <p className="mt-3 max-w-[620px] font-sans text-lg leading-relaxed text-gray-600">
            Colours, typography, components, and layout patterns used across the Royal Wood Shop site.
          </p>
        </div>
      </div>

      {/* Sticky TOC + content */}
      <div className="mx-auto flex max-w-[1280px] gap-12 px-6 py-12 lg:px-8 xl:gap-20">

        {/* Sidebar nav */}
        <aside className="hidden shrink-0 lg:block" style={{ width: 200 }}>
          <nav className="sticky top-8 flex flex-col gap-1" aria-label="Design system sections">
            {[
              ['#colours', 'Colours'],
              ['#typography', 'Typography'],
              ['#buttons', 'Buttons'],
              ['#badges', 'Badges'],
              ['#forms', 'Forms'],
              ['#cards', 'Cards'],
              ['#layout', 'Layout'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 font-sans text-sm text-gray-500 transition-colors hover:bg-parchment hover:text-royal-blue"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">

          {/* ── Colours ── */}
          <Section id="colours" title="Colours">
            <p className="mb-6 font-sans text-sm text-gray-500">
              Defined as CSS custom properties in <code className="font-mono text-xs">@theme</code> in <code className="font-mono text-xs">index.css</code>. Available as Tailwind utilities (<code className="font-mono text-xs">bg-royal-blue</code>, <code className="font-mono text-xs">text-royal-blue</code>, etc.).
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              <Swatch name="Royal Blue" token="bg-royal-blue" hex="#0065AB" />
              <Swatch name="Royal Blue Dark" token="bg-royal-blue-dark" hex="#004F87" />
              <Swatch name="Coffee Bean" token="bg-coffee-bean" hex="#24140D" />
              <Swatch name="Tundora" token="bg-tundora" hex="#343333" />
              <Swatch name="Parchment" token="bg-parchment" hex="#F1EFEA" textClass="text-tundora/60" />
              <Swatch name="Cream" token="bg-cream" hex="#F0EDE5" textClass="text-tundora/60" />
              <Swatch name="White" token="bg-white" hex="#FFFFFF" textClass="text-gray-300" />
              <Swatch name="Gray 100" token="bg-gray-100" hex="#F3F4F6" textClass="text-tundora/60" />
              <Swatch name="Gray 500" token="bg-gray-500" hex="#6B7280" />
              <Swatch name="Gray 900" token="bg-gray-900" hex="#111827" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Swatch name="Green 100" token="bg-green-100" hex="#DCFCE7" textClass="text-green-800" />
              <Swatch name="Amber 100" token="bg-amber-100" hex="#FEF3C7" textClass="text-amber-800" />
              <Swatch name="Red 500" token="bg-red-500" hex="#EF4444" />
              <Swatch name="Emerald 100" token="bg-emerald-100" hex="#D1FAE5" textClass="text-emerald-800" />
            </div>
          </Section>

          {/* ── Typography ── */}
          <Section id="typography" title="Typography">
            <p className="mb-6 font-sans text-sm text-gray-500">
              Three font families. Headings use <strong>font-serif</strong> (Libre Baskerville). UI labels and body copy use <strong>font-sans</strong> (Poppins) or <strong>font-body</strong> (Lato).
            </p>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Serif — Libre Baskerville</h3>
            <div className="mb-8 rounded-xl bg-[#fbfbfb] p-6">
              <TypeSpec label="Display / Hero H1" className="font-serif text-4xl font-bold leading-tight text-coffee-bean lg:text-[44px]" sample="Built for Professionals." />
              <TypeSpec label="Page H1" className="font-serif text-3xl font-bold leading-tight text-royal-blue lg:text-[44px]" sample="Downloads" />
              <TypeSpec label="Section H2" className="font-serif text-2xl font-bold text-coffee-bean lg:text-[30px]" sample="What Makes Us Different" />
              <TypeSpec label="Card / Item H2" className="font-serif text-xl font-bold text-coffee-bean lg:text-[24px]" sample="Royal Woodworking Product Catalogue" />
              <TypeSpec label="Hotspot name" className="font-serif text-base font-bold text-coffee-bean" sample="Colonial Crown Moulding" />
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Sans — Poppins</h3>
            <div className="mb-8 rounded-xl bg-[#fbfbfb] p-6">
              <TypeSpec label="Large body / intro" className="font-sans text-lg leading-relaxed text-gray-600" sample="Product catalogues and brochures from the ranges we carry, free to download." />
              <TypeSpec label="Body / description" className="font-sans text-base leading-relaxed text-gray-600" sample="Royal Woodworking has been a manufacturer and distributor of solid wood products since 1976." />
              <TypeSpec label="UI label" className="font-sans text-sm font-medium text-tundora" sample="First Name" />
              <TypeSpec label="Small / meta" className="font-sans text-xs text-gray-500" sample="Part No. CRO-400" />
              <TypeSpec label="Nav / caps" className="font-sans text-xs font-bold tracking-wide text-gray-500 uppercase" sample="Trim & Moulding" />
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Body — Lato</h3>
            <div className="rounded-xl bg-[#fbfbfb] p-6">
              <TypeSpec label="Nav item" className="font-body text-xs font-bold tracking-wide text-gray-500 uppercase" sample="Interior Doors" />
              <TypeSpec label="Prose body" className="font-body text-base leading-7 text-gray-700" sample="For standard 8-foot ceilings, 5" to 8" baseboard is recommended. The scale should coordinate with your door and window casing and crown moulding." />
            </div>
          </Section>

          {/* ── Buttons ── */}
          <Section id="buttons" title="Buttons">

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Variants</h3>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Primary */}
              <button type="button" className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark">
                Primary
              </button>
              {/* Secondary / outlined */}
              <button type="button" className="rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white">
                Secondary
              </button>
              {/* Ghost / tundora */}
              <button type="button" className="rounded-lg border border-tundora bg-white px-4 py-2.5 font-sans text-sm text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white">
                Get a Quote
              </button>
              {/* Learn more / arrow */}
              <button type="button" className="group inline-flex items-center gap-2 rounded-lg border border-white bg-royal-blue px-4 py-4 font-sans text-base text-white transition-colors hover:bg-white hover:text-royal-blue">
                Learn more
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M1 8h14M9 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Sizes</h3>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <button type="button" className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-4 font-sans text-base text-white hover:bg-royal-blue-dark">Large</button>
              <button type="button" className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base text-white hover:bg-royal-blue-dark">Default</button>
              <button type="button" className="rounded-md border border-royal-blue px-3 py-1.5 font-sans text-xs text-royal-blue hover:bg-royal-blue hover:text-white">Small</button>
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">With icon</h3>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:bg-royal-blue-dark">
                Download
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12" /><path d="m6.8 11.2 5.2 5.2 5.2-5.2" /><path d="M4.5 20h15" />
                </svg>
              </a>
              <button type="button" className="group inline-flex items-center gap-2 rounded-lg border border-tundora bg-white px-4 py-2.5 font-sans text-sm text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white">
                Print spec sheet
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="10" rx="1" /><path d="M6 14h12M6 18h8" />
                </svg>
              </button>
            </div>

            <div className="mt-6">
              <CodeBlock>{`// Primary
className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"

// Secondary
className="rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"

// Ghost (Get a Quote)
className="rounded-lg border border-tundora bg-white px-4 py-2.5 font-sans text-sm text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"

// Small
className="rounded-md border border-royal-blue px-3 py-1.5 font-sans text-xs text-royal-blue hover:bg-royal-blue hover:text-white"`}
              </CodeBlock>
            </div>
          </Section>

          {/* ── Badges ── */}
          <Section id="badges" title="Badges">

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Availability</h3>
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-sans text-xs font-medium text-green-800">In Stock</span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-sans text-xs font-medium text-amber-800">Quick Ship</span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-sans text-xs font-medium text-gray-600">Made-to-Order</span>
              <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 font-sans text-xs font-medium text-white">On Sale</span>
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Status</h3>
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-xs font-semibold text-emerald-600">Paid</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-sans text-xs font-semibold text-amber-700">Due</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-sans text-xs font-semibold text-red-600">Overdue</span>
            </div>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Format / type</h3>
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">PDF</span>
              <span className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">XLSX</span>
            </div>

            <CodeBlock>{`// Availability — In Stock
className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-sans text-xs font-medium text-green-800"

// Availability — Quick Ship
className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-sans text-xs font-medium text-amber-800"

// Availability — Made-to-Order
className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-sans text-xs font-medium text-gray-600"

// Format tag
className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase"

// Status — Paid
className="rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-xs font-semibold text-emerald-600"`}
            </CodeBlock>
          </Section>

          {/* ── Forms ── */}
          <Section id="forms" title="Forms">
            <p className="mb-6 font-sans text-sm text-gray-500">
              All form controls share the same border/focus ring. Labels use <code className="font-mono text-xs">font-sans text-sm font-medium text-tundora</code>.
            </p>

            <div className="max-w-[520px] rounded-2xl border border-royal-blue/20 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ds-name" className="font-sans text-sm font-medium text-tundora">Name</label>
                  <input id="ds-name" type="text" placeholder="e.g. Sarah Chen" className="rounded-lg border border-gray-300 px-4 py-3 font-sans text-sm focus:border-royal-blue focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ds-email" className="font-sans text-sm font-medium text-tundora">Email</label>
                  <input id="ds-email" type="email" placeholder="sarah@example.com" className="rounded-lg border border-gray-300 px-4 py-3 font-sans text-sm focus:border-royal-blue focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ds-msg" className="font-sans text-sm font-medium text-tundora">Message</label>
                  <textarea id="ds-msg" rows={3} placeholder="Your message…" className="rounded-lg border border-gray-300 px-4 py-3 font-sans text-sm focus:border-royal-blue focus:outline-none" />
                </div>
                <button type="button" className="w-fit rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base text-white transition-colors hover:bg-royal-blue-dark">
                  Send message
                </button>
              </div>
            </div>

            <div className="mt-6">
              <CodeBlock>{`// Text input
<label className="font-sans text-sm font-medium text-tundora">Label</label>
<input className="rounded-lg border border-gray-300 px-4 py-3 font-sans text-sm focus:border-royal-blue focus:outline-none" />

// Textarea
<textarea className="rounded-lg border border-gray-300 px-4 py-3 font-sans text-sm focus:border-royal-blue focus:outline-none" />

// Form card wrapper
<div className="rounded-2xl border border-royal-blue/20 bg-white p-8 shadow-sm">`}
              </CodeBlock>
            </div>
          </Section>

          {/* ── Cards ── */}
          <Section id="cards" title="Cards">

            {/* Product card */}
            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Product card</h3>
            <div className="mb-8 flex max-w-[280px]">
              <div className="group relative flex aspect-[2/3] w-full items-end overflow-hidden rounded-2xl border-b-[8px] border-royal-blue p-4 transition-all duration-150 hover:shadow-xl active:scale-[0.96] sm:rounded-[36px] sm:border-b-[15px] sm:p-7" style={{ backgroundImage: 'linear-gradient(135deg,#e5e7eb 0%,#d1d5db 100%)' }}>
                <div className="absolute inset-0 flex flex-col justify-between bg-royal-blue px-4 pt-4 pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:px-7 sm:pt-7 sm:pb-4">
                  <p className="font-sans text-xs leading-relaxed text-white/80">Crown mouldings, baseboards, casings, and more in poplar, MDF, and finger-jointed pine.</p>
                  <p className="font-sans text-xs font-semibold text-white/60 uppercase">View all →</p>
                </div>
                <p className="relative font-serif text-xl font-bold leading-tight text-white drop-shadow sm:text-2xl">Trim &amp; Moulding</p>
              </div>
            </div>
            <CodeBlock>{`<div className="group relative flex aspect-[2/3] items-end overflow-hidden rounded-2xl border-b-[8px] border-royal-blue p-4 transition-all duration-150 hover:shadow-xl active:scale-[0.96] active:brightness-90 active:shadow-none sm:rounded-[36px] sm:border-b-[15px] sm:p-7">
  {/* Hover overlay */}
  <div className="absolute inset-0 flex flex-col justify-between bg-royal-blue px-4 pt-4 pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ...">
    <p className="font-sans text-xs leading-relaxed text-white/80">{description}</p>
    <p className="font-sans text-xs font-semibold text-white/60 uppercase">View all →</p>
  </div>
  <p className="relative font-serif text-xl font-bold leading-tight text-white drop-shadow sm:text-2xl">{name}</p>
</div>`}
            </CodeBlock>

            {/* Download row */}
            <h3 className="mb-4 mt-10 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Download row</h3>
            <div className="mb-4 max-w-[780px]">
              <div className="flex flex-col gap-5 py-8 sm:flex-row sm:items-start sm:gap-7">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fbfbfb]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden className="text-royal-blue" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H7.4A1.9 1.9 0 0 0 5.5 4.9v14.2A1.9 1.9 0 0 0 7.4 21h9.2a1.9 1.9 0 0 0 1.9-1.9V7.5L14 3Z" />
                    <path d="M13.8 3.2V7.6h4.5" />
                    <path d="M12 11.4v5.1" />
                    <path d="M9.7 14.2 12 16.5l2.3-2.3" />
                  </svg>
                </span>
                <div className="flex flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-xl font-bold text-coffee-bean lg:text-[24px]">Royal Woodworking Product Catalogue</h2>
                    <span className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">PDF</span>
                  </div>
                  <p className="font-sans text-base leading-relaxed text-gray-600">Royal Woodworking has been a manufacturer and distributor of solid wood products since 1976.</p>
                </div>
                <a href="#" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:bg-royal-blue-dark sm:mt-1">
                  Download
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v12" /><path d="m6.8 11.2 5.2 5.2 5.2-5.2" /><path d="M4.5 20h15" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Parchment callout card */}
            <h3 className="mb-4 mt-10 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Callout / CTA section</h3>
            <div className="max-w-[780px] rounded-2xl bg-parchment px-8 py-10 text-center">
              <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">Looking for something that isn&rsquo;t here?</h2>
              <p className="mx-auto mt-3 max-w-[480px] font-sans text-base text-gray-600">
                Call us at <a href="tel:9057271387" className="font-medium text-royal-blue underline">905-727-1387</a> or come into the showroom.
              </p>
              <Link to="/contact" className="mt-5 inline-block rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white">
                Contact us
              </Link>
            </div>

            {/* Breadcrumb */}
            <h3 className="mb-4 mt-10 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Breadcrumb</h3>
            <nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
              <Link to="/resources" className="transition-colors hover:text-royal-blue">Resources</Link>
              <span className="mx-2 text-gray-300">/</span>
              <Link to="/resources/downloads" className="transition-colors hover:text-royal-blue">Downloads</Link>
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-gray-700">Royal Woodworking Catalogue</span>
            </nav>
            <CodeBlock>{`<nav aria-label="Breadcrumb" className="font-sans text-sm text-gray-500">
  <Link to="/parent" className="transition-colors hover:text-royal-blue">Parent</Link>
  <span className="mx-2 text-gray-300">/</span>
  <span className="text-gray-700">Current page</span>
</nav>`}
            </CodeBlock>
          </Section>

          {/* ── Layout ── */}
          <Section id="layout" title="Layout">
            <p className="mb-6 font-sans text-sm text-gray-500">
              All pages share a consistent container and section pattern.
            </p>

            <h3 className="mb-4 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Container</h3>
            <CodeBlock>{`// Standard page container
<div className="mx-auto max-w-[1280px] px-6 lg:px-8">

// Content with sidebar
<div className="mx-auto flex max-w-[1280px] gap-12 px-6 py-12 lg:px-8 xl:gap-20">`}
            </CodeBlock>

            <h3 className="mb-4 mt-8 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Section backgrounds</h3>
            <div className="mb-4 flex flex-col gap-3">
              {[
                { label: 'Page header / zebra row', cls: 'bg-[#fbfbfb]', note: 'bg-[#fbfbfb]' },
                { label: 'Content sections', cls: 'bg-white border border-gray-100', note: 'bg-white' },
                { label: 'CTA / callout', cls: 'bg-parchment', note: 'bg-parchment' },
                { label: 'Highlight / cream', cls: 'bg-cream', note: 'bg-cream' },
              ].map(({ label, cls, note }) => (
                <div key={note} className={`flex items-center justify-between rounded-lg px-4 py-3 ${cls}`}>
                  <span className="font-sans text-sm text-gray-700">{label}</span>
                  <code className="font-mono text-xs text-gray-400">{note}</code>
                </div>
              ))}
            </div>

            <h3 className="mb-4 mt-8 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Section padding</h3>
            <CodeBlock>{`// Page header strip
<section className="py-12 lg:py-16">

// Content section
<section className="py-16 lg:py-20">

// CTA / footer callout
<section className="py-14 lg:py-16">`}
            </CodeBlock>

            <h3 className="mb-4 mt-8 font-sans text-sm font-semibold tracking-wide text-gray-400 uppercase">Border radius</h3>
            <div className="flex flex-wrap items-center gap-6">
              {[
                ['rounded-lg', '8px', 'Buttons, inputs'],
                ['rounded-xl', '12px', 'Hotspot popover'],
                ['rounded-2xl', '16px', 'Form cards, file icon'],
                ['rounded-[36px]', '36px', 'Product cards (lg)'],
                ['rounded-full', '9999px', 'Badges, pills'],
              ].map(([cls, px, use]) => (
                <div key={cls} className="flex flex-col items-center gap-2">
                  <div className={`h-14 w-14 bg-royal-blue/10 ${cls}`} />
                  <p className="font-mono text-xs text-gray-500">{cls}</p>
                  <p className="font-sans text-[10px] text-gray-400">{px} · {use}</p>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </>
  )
}
