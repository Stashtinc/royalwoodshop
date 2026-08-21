/**
 * Service-account authentication for Google's read-only APIs.
 *
 * Lifted out of search-console.server.js when Analytics arrived and needed the
 * identical flow. There is no SDK here on purpose: the whole thing is one
 * signed JWT and one POST, and `googleapis` would add ~50MB of transitive
 * dependencies to do it. Node's built-in crypto signs RS256.
 *
 * One service-account key serves both APIs. It still has to be granted access
 * separately in each product — being a user in Search Console does not make
 * you a user in Analytics.
 */

import 'dotenv/config'
import crypto from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const SCOPES = {
  searchConsole: 'https://www.googleapis.com/auth/webmasters.readonly',
  analytics: 'https://www.googleapis.com/auth/analytics.readonly',
}

/* ----------------------------------------------------------- credentials */

export function credentials() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      'GSC_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the whole key file on ' +
      'one line inside single quotes.',
    )
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'GSC_SERVICE_ACCOUNT_JSON is missing client_email or private_key — that ' +
      'is not a service-account key file.',
    )
  }
  return parsed
}

export function hasCredentials() {
  try {
    return Boolean(credentials())
  } catch {
    return false
  }
}

export function serviceAccountEmail() {
  try {
    return credentials()?.client_email || ''
  } catch {
    return ''
  }
}

/* ------------------------------------------------------------------ auth */

/**
 * Tokens are cached per scope, not globally.
 *
 * A token minted for webmasters.readonly is rejected by the Analytics API, so
 * a single shared cache would hand whichever client asked second a token the
 * API refuses — intermittently, depending on call order, which is the worst
 * kind of bug to chase.
 */
const tokenCache = new Map()   // scope -> { value, expiresAt }
const inFlight = new Map()     // scope -> Promise, so concurrent callers share one exchange

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function accessToken(scope) {
  const cached = tokenCache.get(scope)
  if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached.value)

  let pending = inFlight.get(scope)
  if (!pending) {
    pending = exchangeToken(scope).finally(() => inFlight.delete(scope))
    inFlight.set(scope, pending)
  }
  return pending
}

async function exchangeToken(scope) {
  const creds = credentials()
  if (!creds) throw new Error('No service-account key configured.')

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: creds.client_email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(creds.private_key.replace(/\\n/g, '\n'), 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Google refused the service-account key (${res.status}). ` +
      `${body.error_description || body.error || 'No detail given.'}`,
    )
  }

  tokenCache.set(scope, {
    value: body.access_token,
    // Retire it a minute early so a request never starts on a dying token.
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  })
  return body.access_token
}
