import { useRef, useState } from 'react'

/**
 * Signups go to Stasht, into Royal Wood's "New Website Leads" list, and each
 * one becomes a lead there. Stasht sends the double opt-in confirmation email
 * (CASL) and emails Brad when someone confirms.
 *
 * The browser calls Stasht directly, not through our server: Stasht allows 60
 * signups an hour per IP, and a server call would put every visitor behind
 * Railway's one address. The key is public by design; it can only add people
 * to this one list.
 */
const STASHT_SIGNUP_URL =
  import.meta.env.VITE_STASHT_SIGNUP_URL || 'https://restapi.stasht.com/api/react/public/lists/subscribe'
const STASHT_SIGNUP_KEY =
  import.meta.env.VITE_STASHT_SIGNUP_KEY || 'ls_3LSb6WWHSNbWfDjkonZ1kyltPxjx781LBXKtKVsq'

const GENERIC_ERROR = 'Something went wrong, please try again.'

export default function NewsletterSignup() {
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const email = inputRef.current?.value?.trim()
    const honeypot = e.currentTarget.elements.company?.value ?? ''
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(STASHT_SIGNUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        // Stasht's honeypot field is "website": if it is filled in, Stasht
        // quietly drops the signup. Never send a phone number.
        body: JSON.stringify({ key: STASHT_SIGNUP_KEY, email, website: honeypot }),
      })
      const data = await res.json().catch(() => ({}))
      // The same 200 comes back for new, existing and unsubscribed addresses,
      // so the form never reveals who is already on the list.
      if (res.ok && data.ok) {
        setStatus('success')
        return
      }
      if (data.error === 'invalid_email') {
        setError(data.message || 'Please enter a valid email address.')
      } else if (data.error === 'too_many_requests' || res.status === 429) {
        setError('Too many tries. Please wait a minute and try again.')
      } else {
        console.error('[newsletter] Stasht signup failed', res.status, data)
        setError(GENERIC_ERROR)
      }
      setStatus('idle')
    } catch (err) {
      console.error('[newsletter] Stasht signup failed', err)
      setError(GENERIC_ERROR)
      setStatus('idle')
    }
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
                <p className="font-serif text-xl font-bold text-white">Thanks!</p>
                <p className="font-sans text-sm text-white/60">Check your inbox to confirm your subscription.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
                {/* Honeypot: hidden from people, irresistible to bots. */}
                <div aria-hidden="true" className="absolute -left-[9999px]">
                  <label>Company<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
                </div>
                <div className="flex overflow-hidden rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <input
                    ref={inputRef}
                    type="email"
                    name="email"
                    required
                    aria-label="Email address"
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? 'newsletter-error' : undefined}
                    disabled={status === 'loading'}
                    placeholder="Your email address"
                    className="min-w-0 flex-1 bg-transparent px-5 py-4 font-sans text-sm text-white placeholder-white/30 outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="shrink-0 bg-royal-blue px-6 py-4 font-sans text-sm font-bold text-white transition-colors hover:bg-royal-blue-dark disabled:opacity-60"
                  >
                    {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
                  </button>
                </div>
                {error && (
                  <p id="newsletter-error" role="alert" className="font-sans text-xs text-red-400">{error}</p>
                )}
                <p className="font-sans text-xs text-white/30">
                  No spam. Unsubscribe any time.
                </p>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
