#!/usr/bin/env node
/**
 * Installs a Google service-account key into .env and proves it works.
 *
 *   npm run gsc:connect -- ~/Downloads/royal-wood-shop-site-abc123.json
 *   npm run gsc:connect                 (re-tests whatever is already in .env)
 *
 * Pasting the key by hand is the step most likely to go wrong: the private key
 * contains real newlines, so it has to be JSON-escaped onto a single line or
 * the .env parser truncates it at the first break and Google rejects a key that
 * looks fine in the file. This does that escaping, then makes a live call so a
 * mistake surfaces here rather than as an empty dashboard.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import crypto from 'node:crypto'

const ENV = '.env'
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const info = (m) => console.log(`    ${m}`)

function die(message, hint) {
  console.error(`\n\x1b[31m${message}\x1b[0m`)
  if (hint) console.error(`\n${hint}`)
  console.error('')
  process.exit(1)
}

/* ------------------------------------------------------- read/write the env */

function readEnv() {
  if (!existsSync(ENV)) return {}
  const out = {}
  for (const line of readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

/** Replaces a key in place if present, appends it if not, leaving every other
 *  line — including comments — exactly as it was. */
function setEnv(key, value) {
  const line = `${key}=${JSON.stringify(value)}`
  let text = existsSync(ENV) ? readFileSync(ENV, 'utf8') : ''
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm')
  if (re.test(text)) {
    text = text.replace(re, line)
  } else {
    if (text && !text.endsWith('\n')) text += '\n'
    text += `${line}\n`
  }
  writeFileSync(ENV, text)
}

/* --------------------------------------------------------------- the checks */

async function accessToken(creds) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'RS256', typ: 'JWT' })
  const claims = b64({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const sig = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`)
    .sign(creds.private_key.replace(/\\n/g, '\n'), 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${sig}`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    die(`Google rejected the key (${res.status}): ${body.error_description || body.error}`,
      'If this says "Invalid JWT Signature", the key file is damaged — create a\n' +
      'fresh one in Google Cloud (Service account → Keys → Add key).')
  }
  return body.access_token
}

/* ---------------------------------------------------------------- main flow */

console.log('\nGoogle Search Console — connection check\n')

const keyPath = process.argv[2]
const env = readEnv()

// 1. The key
if (keyPath) {
  const full = resolve(keyPath.replace(/^~/, process.env.HOME ?? '~'))
  if (!existsSync(full)) die(`No file at ${full}`, 'Pass the path to the JSON key you downloaded from Google Cloud.')

  let creds
  try {
    creds = JSON.parse(readFileSync(full, 'utf8'))
  } catch {
    die(`${full} is not valid JSON.`, 'Make sure you picked JSON, not P12, when creating the key.')
  }
  if (!creds.client_email || !creds.private_key) {
    die('That JSON has no client_email / private_key — it is not a service-account key.',
      'In Google Cloud: IAM & Admin → Service accounts → your account → Keys → Add key.')
  }

  if (existsSync(ENV)) {
    copyFileSync(ENV, `${ENV}.backup`)
    info(`existing .env backed up to .env.backup`)
  }
  setEnv('GSC_SERVICE_ACCOUNT_JSON', JSON.stringify(creds))
  ok(`key installed for ${creds.client_email}`)
} else if (!env.GSC_SERVICE_ACCOUNT_JSON) {
  die('No key in .env and no file given.',
    'Run:  npm run gsc:connect -- ~/Downloads/your-key.json')
} else {
  ok('using the key already in .env')
}

// 2. The property
const fresh = readEnv()
const site = fresh.GSC_SITE_URL?.trim()
if (!site) {
  die('GSC_SITE_URL is not set in .env.',
    'Copy the resource_id from the Search Console address bar and URL-decode it,\n' +
    'e.g.  GSC_SITE_URL="http://www.cbeckermann.com/"')
}
ok(`property: ${site}`)

let creds
try {
  creds = JSON.parse(fresh.GSC_SERVICE_ACCOUNT_JSON)
} catch {
  die('GSC_SERVICE_ACCOUNT_JSON in .env is not readable.',
    'Re-run with the key file path to rewrite it correctly.')
}

// 3. Google accepts the key
const token = await accessToken(creds)
ok('Google accepted the key and issued a token')

// 4. The service account can see this property
const listRes = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
  headers: { authorization: `Bearer ${token}` },
})
const list = await listRes.json().catch(() => ({}))
const visible = (list.siteEntry ?? []).map((s) => s.siteUrl)

if (!visible.length) {
  die(`The service account cannot see any property yet.`,
    `Add this address in Search Console → Settings → Users and permissions,\n` +
    `with permission set to Full (Restricted cannot read the API):\n\n` +
    `    ${creds.client_email}\n\n` +
    `Permissions can take a minute to propagate — if you just added it, wait and re-run.`)
}

if (!visible.includes(site)) {
  die(`The service account has access, but not to "${site}".`,
    `It can currently see:\n${visible.map((s) => `    ${s}`).join('\n')}\n\n` +
    `Set GSC_SITE_URL in .env to one of those, exactly as written above.\n` +
    `http:// and https://, and www and bare, are different properties to Google.`)
}
ok(`the service account has access to ${site}`)

// 5. Real data comes back
const end = new Date(); end.setUTCDate(end.getUTCDate() - 2)
const start = new Date(end); start.setUTCDate(start.getUTCDate() - 27)
const iso = (d) => d.toISOString().slice(0, 10)

const dataRes = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
  {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions: [] }),
  },
)
const data = await dataRes.json().catch(() => ({}))
if (!dataRes.ok) die(`Search Analytics refused the request: ${data.error?.message || dataRes.status}`)

const row = data.rows?.[0]
ok('search analytics responded')

console.log(`\n  Last 28 days (${iso(start)} → ${iso(end)}):`)
if (row) {
  console.log(`    clicks       ${Math.round(row.clicks)}`)
  console.log(`    impressions  ${Math.round(row.impressions)}`)
  console.log(`    CTR          ${(row.ctr * 100).toFixed(1)}%`)
  console.log(`    position     ${row.position.toFixed(1)}`)
} else {
  console.log('    no data — the property is connected but had no impressions in this window')
}

console.log(`\n\x1b[32mConnected.\x1b[0m Restart the dev server and open /admin.\n`)
