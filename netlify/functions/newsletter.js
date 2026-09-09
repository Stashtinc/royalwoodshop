export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let email
  try {
    const form = await req.formData()
    email = String(form.get('email') ?? '').trim()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.MAILCHIMP_API_KEY?.trim()
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim()
  const serverPrefix = apiKey?.split('-').pop()

  if (!apiKey || !audienceId) {
    return new Response(JSON.stringify({ error: 'Newsletter signup is unavailable right now.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
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
      body: JSON.stringify({ email_address: email, status: 'subscribed' }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Newsletter signup is unavailable right now.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Already subscribed — treat as success so we don't leak whether an address is on the list
    if (body.title === 'Member Exists') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: body.detail || 'Could not subscribe. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}
