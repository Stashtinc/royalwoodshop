/**
 * Editorial assistance for the blog editor, backed by OpenAI.
 *
 * Two jobs only: draft an article body, and write the search-listing fields
 * for an article that already exists. Both return a proposal that a person
 * reviews before anything reaches the editor — nothing here writes to the
 * database or edits a post directly.
 *
 * One provider for text and images, so there is a single key and a single
 * bill. `.server.js` keeps that key out of the browser bundle.
 */

import 'dotenv/config'
import { getDb } from './db.server'
import { products, categories as categoriesTable } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

const API_URL = 'https://api.openai.com/v1/chat/completions'

/** Small and inexpensive; drafting does not need a frontier model. Model names
 *  move faster than this codebase, so it is overridable. */
const DEFAULT_MODEL = 'gpt-4o-mini'

export function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

/* ------------------------------------------------------------- house style */

/**
 * Who Royal Wood Shop is. Without this the model writes generic home-renovation
 * filler that could be any supplier in any country — the specifics are what
 * make a draft worth editing rather than worth deleting.
 */
const BUSINESS = `
The Royal Wood Shop has supplied architectural trim, mouldings and interior
doors since 1982, from a showroom serving the Greater Toronto Area and York
Region. Customers are homeowners renovating, along with builders, renovators,
designers and trim carpenters working on residential projects.

The range covers interior mouldings (casing, baseboard, crown, chair rail,
panel mould, shoe rail), interior doors, door hardware, and stair and railing
components, in solid wood, primed wood, finger-joint pine, MDF and combinations
of those.

Voice: plain, practical and specific. The reader is renovating a house, not
reading a brochure. Explain what something is and where it is used before
claiming it is beautiful. Canadian spelling — moulding, colour, metre. No
exclamation marks, no "elevate your space", no "nestled", no invented awards,
statistics or history beyond what is given here.
`.trim()

/** A sample of the real range, so the model names products that exist. */
async function catalogueContext() {
  try {
    const db = await getDb()
    const list = await db
      .select({ category: categoriesTable.name, product: products.name })
      .from(products)
      .innerJoin(categoriesTable, eq(categoriesTable.id, products.primaryCategoryId))
      .where(eq(products.status, 'published'))
      .orderBy(categoriesTable.name, sql`random()`)
    const byCategory = {}
    for (const r of list) {
      byCategory[r.category] ??= []
      // A dozen per category is enough to convey range and vocabulary without
      // spending the whole prompt budget on a product list.
      if (byCategory[r.category].length < 12) byCategory[r.category].push(r.product)
    }
    const lines = Object.entries(byCategory)
      .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
    if (!lines.length) return ''
    return `\nExamples of real products currently in the catalogue. Use these names ` +
      `exactly if you mention a product; never invent a product name or code:\n${lines.join('\n')}`
  } catch {
    // No database (or an empty one) is not a reason to refuse to write.
    return ''
  }
}

/* --------------------------------------------------------------- api call */

export async function callText({ system, messages, maxTokens = 4000 }) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error(
      'No OpenAI API key. Set OPENAI_API_KEY in .env — see docs/ai-assist-setup.md.',
    )
  }

  const send = (extra) => fetch(API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_MODEL,
      max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
      ...extra,
    }),
    signal: AbortSignal.timeout(120000),
  })

  let res
  try {
    // JSON mode, since every caller here parses the reply as JSON. It requires
    // the word "json" in the prompt, which each of our system prompts has.
    res = await send({ response_format: { type: 'json_object' } })
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('OpenAI took too long to respond. Try again.')
    throw new Error(`Could not reach OpenAI: ${e.message}`)
  }

  let body = await res.json().catch(() => ({}))

  // Not every model supports JSON mode, or the token parameter name. Retry
  // plainly rather than encoding a compatibility matrix that will go stale.
  if (!res.ok && res.status === 400 && /response_format|max_completion_tokens|json/i.test(body.error?.message ?? '')) {
    res = await send({})
    body = await res.json().catch(() => ({}))
  }

  if (!res.ok) {
    const detail = body.error?.message || `HTTP ${res.status}`
    if (res.status === 401) throw new Error('OpenAI rejected the API key. Check OPENAI_API_KEY.')
    if (res.status === 429) throw new Error('Rate limited by OpenAI, or the account is out of credit.')
    if (res.status === 400 && /model/i.test(detail)) {
      throw new Error(`${detail} — set OPENAI_TEXT_MODEL in .env to a model your account can use.`)
    }
    throw new Error(detail)
  }

  return body.choices?.[0]?.message?.content?.trim() ?? ''
}

/* --------------------------------------------------------------- sanitise */

/**
 * The editor stores raw HTML, so what the model returns cannot be trusted straight
 * into the page. This keeps the handful of tags the editor itself can produce
 * and drops everything else — script, style, iframe, event handlers, and any
 * attribute other than href on a link.
 */
const ALLOWED = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a', 'br'])

export function sanitiseHtml(input) {
  let html = String(input ?? '')

  // Strip anything with a body we do not want, content and all.
  html = html.replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi, '')
  // ...and their unclosed forms.
  html = html.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>/gi, '')

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagRaw, attrs) => {
    const tag = tagRaw.toLowerCase()
    if (!ALLOWED.has(tag)) return ''
    if (match.startsWith('</')) return `</${tag}>`

    if (tag === 'a') {
      const href = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const url = (href?.[2] ?? href?.[3] ?? href?.[4] ?? '').trim()
      // javascript:, data: and vbscript: URLs are the whole reason this exists.
      if (!/^(https?:\/\/|\/|mailto:)/i.test(url)) return '<a>'
      return `<a href="${url.replace(/"/g, '&quot;')}">`
    }
    return `<${tag}>`
  })

  return html.trim()
}

/** JSON mode should make this exact, but a stray sentence around the object is
 *  a known failure on models that do not support it, and not worth failing the
 *  whole request over. */
function parseJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('The model did not return usable data. Try again.')
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('The model returned malformed data. Try again.')
  }
}

function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ---------------------------------------------------------------- actions */

const LENGTHS = {
  short: 'about 400 words, 2 to 3 sections',
  medium: 'about 800 words, 4 to 5 sections',
  long: 'about 1,400 words, 6 to 8 sections',
}

/**
 * Draft an article body from a topic and optional notes.
 * Returns { title, html } — the title is a suggestion the user can ignore.
 */
export async function draftArticle({ topic, notes = '', length = 'medium' }) {
  if (!topic?.trim()) throw new Error('Give the assistant a topic to write about.')

  const system = `${BUSINESS}${await catalogueContext()}

You are drafting a blog article for The Royal Wood Shop's website. Write ${LENGTHS[length] ?? LENGTHS.medium}.

Return JSON only, no commentary, in this exact shape:
{"title": "...", "html": "..."}

"title" is a plain headline, under 70 characters, no site name.
"html" is the article body only — no <h1>, since the title is rendered separately.

Only these tags are permitted in "html": <p> <h2> <h3> <ul> <ol> <li> <blockquote> <strong> <em> <a>.
No attributes except href on a link. No inline styles, no classes, no images.

Do not invent prices, dimensions, product codes, delivery times, warranties,
awards or customer quotes. If a specific figure would help, describe what it
depends on instead. Where a genuine measurement is standard in the trade
(for example that baseboard is commonly 3 to 5 inches tall) it is fine to say so.`

  const notesLine = notes.trim() ? `\n\nPoints to cover:\n${notes.trim()}` : ''
  const text = await callText({
    system,
    maxTokens: 4000,
    messages: [{ role: 'user', content: `Topic: ${topic.trim()}${notesLine}` }],
  })

  const data = parseJson(text)
  const html = sanitiseHtml(data.html)
  if (!html) throw new Error('The model returned an empty article. Try again.')

  return {
    title: String(data.title ?? '').trim().slice(0, 200),
    html,
    words: plainText(html).split(/\s+/).filter(Boolean).length,
  }
}

/**
 * Write the summary and search-listing fields for an article that exists.
 * Returns { excerpt, seoTitle, seoDescription }.
 */
export async function draftMetadata({ title, contentHtml }) {
  const body = plainText(contentHtml)
  if (body.split(/\s+/).filter(Boolean).length < 40) {
    throw new Error('Write the article first — there is not enough text to summarise yet.')
  }

  const system = `${BUSINESS}

You write the search-listing fields for an existing article. Return JSON only:
{"excerpt": "...", "seoTitle": "...", "seoDescription": "..."}

excerpt        — 1 to 2 sentences shown on the blog listing. Plain text.
seoTitle       — under 60 characters. Do not include "Royal Wood Shop"; the site
                 name is appended automatically, and repeating it truncates the
                 result in Google.
seoDescription — 140 to 155 characters. Describe what the reader will learn.
                 No clickbait, no "click here", no ellipsis padding.

Every field must reflect what the article actually says. Do not introduce claims
that are not in the text.`

  const text = await callText({
    system,
    maxTokens: 1000,
    messages: [{
      role: 'user',
      content: `Title: ${title || '(untitled)'}\n\nArticle:\n${body.slice(0, 12000)}`,
    }],
  })

  const data = parseJson(text)
  return {
    excerpt: String(data.excerpt ?? '').trim().slice(0, 500),
    seoTitle: String(data.seoTitle ?? '').trim().slice(0, 200),
    seoDescription: String(data.seoDescription ?? '').trim().slice(0, 300),
  }
}
