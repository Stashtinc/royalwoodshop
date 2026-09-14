export async function action({ request }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const params = new URLSearchParams(await request.text())
  const email = params.get('email')?.trim() ?? ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

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
      body: JSON.stringify({ email_address: email, status: 'subscribed' }),
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
