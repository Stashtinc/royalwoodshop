import { useState } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    // TODO: wire to Mailchimp / email service
    setStatus('success')
    setEmail('')
  }

  return (
    <section className="relative w-full overflow-hidden bg-[#0f1f2e] py-20 lg:py-28">

      {/* Decorative background rings */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-[350px] w-[350px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full border border-white/5" />

      {/* Royal blue glows */}
      <div className="pointer-events-none absolute top-0 right-1/4 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(0,101,171,0.18)' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-60 w-60 rounded-full blur-3xl" style={{ background: 'rgba(0,101,171,0.12)' }} />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">

          {/* Left — copy */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-royal-blue" />
              <span className="font-sans text-xs font-bold tracking-widest text-royal-blue uppercase">
                Newsletter
              </span>
            </div>

            <h2 className="font-serif text-4xl font-bold leading-tight text-white lg:text-5xl">
              Around<br />
              <span className="italic text-royal-blue">the Mill</span>
            </h2>

            <p className="max-w-sm font-sans text-base leading-relaxed text-white/60">
              Industry tips, new product arrivals, and project inspiration from The Royal Wood Shop — straight to your inbox.
            </p>

            <div className="flex flex-wrap gap-6 font-sans text-sm text-white/40">
              {['Product news', 'Project ideas', 'Trade tips'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-royal-blue" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="flex flex-col gap-5">
            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-serif text-xl font-bold text-white">You're in!</p>
                <p className="font-sans text-sm text-white/60">Watch for the next issue of Around the Mill.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-xl border border-white/10 px-5 py-4 font-sans text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-royal-blue"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-royal-blue px-6 py-4 font-sans text-sm font-bold text-white transition-all hover:bg-royal-blue-dark hover:shadow-lg active:scale-[0.99]"
                  style={{ boxShadow: undefined }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,101,171,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                  Subscribe to Around the Mill
                </button>
                <p className="text-center font-sans text-xs text-white/30">
                  No spam. Unsubscribe any time.
                </p>
              </form>
            )}

            {/* Social proof */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex -space-x-2">
                {['#0065ab', '#004f87', '#1d4ed8'].map((color, i) => (
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-[#0f1f2e]" style={{ background: color }} />
                ))}
              </div>
              <p className="font-sans text-xs text-white/40">
                Join fellow woodworkers and trade professionals
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
