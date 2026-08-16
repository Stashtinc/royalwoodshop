/**
 * Confirms AI Assist is wired up correctly.
 *
 *   npm run ai:check
 *
 * Checks the key, then checks the two models the app defaults to are actually
 * available on this account, then makes one real (cheap) text call. Model
 * availability is the thing most likely to be wrong — names change, and access
 * differs by account — and finding out here beats finding out from a failed
 * generation halfway through writing an article.
 *
 * No image is generated: that costs real money, and a working text call plus a
 * visible image model is enough to prove the path.
 */
import 'dotenv/config'

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`)

function die(message, hint) {
  console.error(`\n\x1b[31m${message}\x1b[0m`)
  if (hint) console.error(`\n${hint}`)
  console.error('')
  process.exit(1)
}

console.log('\nAI Assist — connection check\n')

const key = process.env.OPENAI_API_KEY?.trim()
if (!key) {
  die('OPENAI_API_KEY is not set in .env.',
    'Get a key at https://platform.openai.com — see docs/ai-assist-setup.md.')
}
ok(`key present (${key.slice(0, 7)}…${key.slice(-4)})`)

const auth = { authorization: `Bearer ${key}` }

/* ------------------------------------------------------- what can it see? */

let list
try {
  const res = await fetch('https://api.openai.com/v1/models', { headers: auth })
  const body = await res.json()
  if (!res.ok) {
    if (res.status === 401) die('OpenAI rejected the key.', 'Check it was copied whole, and has not been revoked.')
    die(`OpenAI returned ${res.status}: ${body.error?.message ?? 'no detail'}`)
  }
  list = (body.data ?? []).map((m) => m.id)
} catch (e) {
  die(`Could not reach OpenAI: ${e.cause?.code ?? e.message}`,
    'Check the machine has internet access and nothing is blocking api.openai.com.')
}
ok(`key works — ${list.length} models available on this account`)

const textModel = process.env.OPENAI_TEXT_MODEL?.trim() || 'gpt-4o-mini'
const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1'

const suggest = (missing, kind, envVar) => {
  const candidates = list.filter((m) => (kind === 'image' ? /image/.test(m) : /^(gpt|o\d)/.test(m) && !/image|audio|realtime|tts|whisper|embedding|moderation/.test(m)))
  warn(`${kind} model "${missing}" is not available on this account.`)
  if (candidates.length) {
    console.log(`    Set ${envVar} in .env to one of:`)
    for (const c of candidates.slice(0, 8)) console.log(`      ${c}`)
    if (candidates.length > 8) console.log(`      …and ${candidates.length - 8} more`)
  }
}

if (list.includes(textModel)) ok(`text model available: ${textModel}`)
else suggest(textModel, 'text', 'OPENAI_TEXT_MODEL')

if (list.includes(imageModel)) ok(`image model available: ${imageModel}`)
else suggest(imageModel, 'image', 'OPENAI_IMAGE_MODEL')

/* ---------------------------------------------------- one real text call */

if (!list.includes(textModel)) {
  console.log('\nFix the text model above, then run this again.\n')
  process.exit(1)
}

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({
    model: textModel,
    max_completion_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Reply with JSON only: {"ok": true, "line": "..."} where line is one short sentence about interior mouldings, in Canadian spelling.' },
      { role: 'user', content: 'Say something true about baseboard.' },
    ],
  }),
})
const body = await res.json()

if (!res.ok) {
  const detail = body.error?.message ?? `HTTP ${res.status}`
  if (res.status === 429) {
    die(`Rate limited or out of credit: ${detail}`,
      'Add credit at https://platform.openai.com/settings/organization/billing.')
  }
  die(`The text call failed: ${detail}`)
}

let parsed
try {
  parsed = JSON.parse(body.choices[0].message.content)
} catch {
  warn('The model replied, but not as JSON. The app tolerates this, but quality may vary.')
}

ok('text generation works')
if (parsed?.line) console.log(`    sample: “${parsed.line}”`)

const used = body.usage
if (used) console.log(`    tokens: ${used.prompt_tokens} in, ${used.completion_tokens} out`)

console.log(`\n\x1b[32mReady.\x1b[0m Restart the dev server and open an article — AI Assist is top right.\n`)
console.log('Images are not tested here, since each generation costs a few cents.')
console.log('The Header image tab will use ' + imageModel + '.\n')
process.exit(0)
