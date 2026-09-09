export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const params = new URLSearchParams(event.body || '')
  const email = params.get('email')?.trim() ?? ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Please enter a valid email address.' }),
    }
  }

  const apiKey = process.env.MAILCHIMP_API_KEY?.trim()
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim()
  const serverPrefix = apiKey?.split('-').pop()

  if (!apiKey || !audienceId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Newsletter signup is unavailable right now.' }),
    }
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Newsletter signup is unavailable right now.' }),
    }
  }

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (body.title === 'Member Exists') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    }
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: body.detail || 'Could not subscribe. Please try again.' }),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  }
}
