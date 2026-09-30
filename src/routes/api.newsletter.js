/** Five signups an hour from one connection: more than any household or
 *  office needs, far fewer than a bot wants. */
let limiter

export async function action({ request }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const params = new URLSearchParams(await request.text())

  // Honeypot: a field people never see. Pretend it worked so the bot learns
  // nothing, but send nothing.
  if (params.get('company')?.trim()) return Response.json({ ok: true })

  const email = params.get('email')?.trim() ?? ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const { createLimiter, clientIp } = await import('../lib/rate-limit.server.js')
  limiter ??= createLimiter({ limit: 5, windowMs: 60 * 60_000 })
  const ip = clientIp(request)
  if (limiter.retryAfter(ip)) {
    return Response.json({ error: 'Too many signups from your connection. Please try again later.' }, { status: 429 })
  }
  limiter.hit(ip)

  const apiKey = process.env.MAILCHIMP_API_KEY?.trim()
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim()
  const serverPrefix = apiKey?.split('-').pop()

  if (!apiKey || !audienceId) {
    return Response.json({ error: 'Newsletter signup is unavailable right now.' }, { status: 500 })
  }

  const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`
  const credentials = Buffer.from(`anystring:${apiKey}`).toString('base64')

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      // 'pending': Mailchimp emails a confirmation link and subscribes the
      // address only once it is clicked. That double opt-in is the proof of
      // consent Canada's anti-spam law (CASL) expects, and a bot cannot
      // confirm a mailbox it does not own.
      body: JSON.stringify({ email_address: email, status: 'pending' }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return Response.json({ error: 'Newsletter signup is unavailable right now.' }, { status: 500 })
  }

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (body.title === 'Member Exists') {
      return Response.json({ ok: true })
    }
    return Response.json({ error: body.detail || 'Could not subscribe. Please try again.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
