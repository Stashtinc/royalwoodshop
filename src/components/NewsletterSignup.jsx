import { useState } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | success | error

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    // TODO: wire to Mailchimp / email service
    setStatus('success')
    setEmail('')
  }

  return (
    <section className="w-full bg-parchment py-16 lg:py-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">

          <div className="flex flex-col gap-2">
            <p className="font-sans text-xs font-bold tracking-widest text-royal-blue uppercase">
              Newsletter
            </p>
            <h2 className="font-serif text-3xl font-bold text-tundora lg:text-4xl">
              Around the Mill
            </h2>
            <p className="mx-auto max-w-md font-sans text-base leading-relaxed text-gray-500">
              Tips, product news, and project inspiration from The Royal Wood Shop — delivered to your inbox.
            </p>
          </div>

          {status === 'success' ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-6 py-4 font-sans text-sm font-medium text-emerald-700">
              <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You're in! Watch for the next issue of Around the Mill.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 outline-none transition-colors focus:border-royal-blue"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-royal-blue px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-royal-blue-dark"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="font-sans text-xs text-gray-400">
            No spam. Unsubscribe any time.
          </p>
        </div>
      </div>
    </section>
  )
}
