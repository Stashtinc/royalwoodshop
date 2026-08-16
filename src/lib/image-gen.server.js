/**
 * Feature-image generation for blog articles.
 *
 * Two steps, deliberately separate. A text model reads the finished article and
 * composes an image prompt in a fixed house style; the image model renders it.
 * Splitting them means the prompt is visible and editable before any money is
 * spent, and the house style lives in one place rather than in whatever the
 * author happened to type.
 *
 * Both steps are OpenAI, so one key covers everything. The provider sits behind
 * one function, so swapping it later is an adapter and an environment variable
 * rather than a rewrite.
 */

import 'dotenv/config'
import { callText } from './ai.server'
import { saveImageBuffer } from './uploads.server'

const OPENAI_URL = 'https://api.openai.com/v1/images/generations'
const OPENAI_EDIT_URL = 'https://api.openai.com/v1/images/edits'

/** Overridable because model names move faster than this codebase will. */
const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1'
const DEFAULT_SIZE = process.env.OPENAI_IMAGE_SIZE?.trim() || '1536x1024'

export function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

/* ----------------------------------------------------------- house style */

/**
 * The look every feature image should share.
 *
 * A blog whose header images are visibly from four different generators reads
 * as neglected, so the constraints here matter more than any single image.
 */
const IMAGE_STYLE = `
Photographic interior photography, as shot for a Canadian home renovation
magazine. Natural daylight from a window, soft shadows, warm neutral palette.
Realistic residential rooms in Ontario homes — not showhomes, not luxury
mansions. Composed as a wide landscape header image with room around the
subject. Shallow depth of field. No people, no text, no logos, no watermarks,
no collages, no visible brand names.
`.trim()

/**
 * Ask the text model for an image prompt and matching alt text.
 *
 * Alt text comes from the same call because it describes the same intended
 * image, and asking twice invites the two to drift apart.
 */
export async function composePrompt({ title, contentHtml }) {
  const body = String(contentHtml ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!title?.trim() && body.length < 40) {
    throw new Error('Write the article first — there is nothing to base an image on yet.')
  }

  const system = `You write prompts for an image generator, for the header image of a
blog article on a Canadian architectural trim and moulding supplier's website.

Return JSON only:
{"prompt": "...", "alt": "..."}

"prompt" describes one specific photograph. Name the room, the trim or millwork
that should be visible, the light, and the camera angle. Be concrete: "a bright
living room with 5 inch painted baseboard and a two-piece crown moulding, shot
from a low angle in late afternoon light" beats "a beautiful room with trim".
Do not restate the style rules below — they are appended automatically.
Keep it under 80 words.

"alt" is the alt text for that image: one plain sentence, under 125 characters,
describing what a reader would see. Not a caption, not marketing copy.

The image must not contain text, since generated lettering renders as
nonsense and this is a header image, not a poster.`

  const text = await callText({
    system,
    maxTokens: 600,
    messages: [{
      role: 'user',
      content: `Article title: ${title || '(untitled)'}\n\nArticle:\n${body.slice(0, 6000)}`,
    }],
  })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1) throw new Error('The model did not return a usable prompt. Try again.')
  let data
  try {
    data = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('The model returned a malformed prompt. Try again.')
  }

  return {
    prompt: String(data.prompt ?? '').trim().slice(0, 1500),
    alt: String(data.alt ?? '').trim().slice(0, 300),
  }
}

/* --------------------------------------------------------------- provider */

function fullPrompt(prompt) {
  return `${prompt.trim()}\n\nStyle: ${IMAGE_STYLE}`
}

async function openaiImage(prompt, { size = DEFAULT_SIZE } = {}) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('No OpenAI API key. Set OPENAI_API_KEY in .env — see docs/ai-assist-setup.md.')
  }

  const request = (imageSize) => fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      prompt: fullPrompt(prompt),
      n: 1,
      size: imageSize,
    }),
    signal: AbortSignal.timeout(180000),
  })

  let res
  try {
    res = await request(size)
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('The image model took too long. Try again.')
    throw new Error(`Could not reach OpenAI: ${e.message}`)
  }

  let body = await res.json().catch(() => ({}))

  // Sizes differ between image models. Rather than encode a matrix that will be
  // wrong within a year, fall back to the one every model accepts.
  if (!res.ok && res.status === 400 && /size/i.test(body.error?.message ?? '') && size !== '1024x1024') {
    res = await request('1024x1024')
    body = await res.json().catch(() => ({}))
  }

  if (!res.ok) {
    const detail = body.error?.message || `HTTP ${res.status}`
    if (res.status === 401) throw new Error('OpenAI rejected the API key. Check OPENAI_API_KEY.')
    if (res.status === 429) throw new Error('Rate limited by OpenAI, or the account is out of credit.')
    if (/model/i.test(detail) && res.status === 400) {
      throw new Error(
        `${detail} — set OPENAI_IMAGE_MODEL in .env to a model your account can use.`,
      )
    }
    if (res.status === 400) throw new Error(`OpenAI refused the prompt: ${detail}`)
    throw new Error(detail)
  }

  const item = body.data?.[0]
  if (!item) throw new Error('OpenAI returned no image.')

  // Newer image models return base64; older ones return a short-lived URL.
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64')
  if (item.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(60000) })
    if (!img.ok) throw new Error('Could not download the generated image.')
    return Buffer.from(await img.arrayBuffer())
  }
  throw new Error('OpenAI returned an image in a format we do not understand.')
}

/**
 * Re-renders an existing image with a change described in words.
 *
 * This is the edit endpoint, not a fresh generation: the model is given the
 * chosen picture and keeps its composition, so "make the trim white" returns
 * the same room rather than a different house. A new generation from an edited
 * prompt would not — that is the whole reason this exists separately.
 */
async function openaiEdit(baseBuffer, instruction) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('No OpenAI API key. Set OPENAI_API_KEY in .env — see docs/ai-assist-setup.md.')
  }

  const form = new FormData()
  form.append('model', DEFAULT_MODEL)
  form.append('prompt', fullPrompt(instruction))
  form.append('n', '1')
  form.append('image', new Blob([baseBuffer], { type: 'image/png' }), 'base.png')

  let res
  try {
    res = await fetch(OPENAI_EDIT_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },   // no content-type: FormData sets the boundary
      body: form,
      signal: AbortSignal.timeout(180000),
    })
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('The image model took too long. Try again.')
    throw new Error(`Could not reach OpenAI: ${e.message}`)
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = body.error?.message || `HTTP ${res.status}`
    if (res.status === 401) throw new Error('OpenAI rejected the API key. Check OPENAI_API_KEY.')
    if (res.status === 429) throw new Error('Rate limited by OpenAI, or the account is out of credit.')
    if (res.status === 400 && /model/i.test(detail)) {
      throw new Error(
        `${detail} — OPENAI_IMAGE_MODEL must be a model that supports editing for variations to work.`,
      )
    }
    throw new Error(detail)
  }

  const item = body.data?.[0]
  if (!item) throw new Error('OpenAI returned no image.')
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64')
  if (item.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(60000) })
    if (!img.ok) throw new Error('Could not download the generated image.')
    return Buffer.from(await img.arrayBuffer())
  }
  throw new Error('OpenAI returned an image in a format we do not understand.')
}

/* ---------------------------------------------------------------- actions */

/**
 * Renders `count` variations of one prompt.
 *
 * Requests run in parallel and are settled independently: one refusal or
 * timeout out of three should still leave two images to choose from. They are
 * returned as data URLs and held in the browser — nothing is written to disk
 * until someone picks one, so discarded options leave no files behind.
 */
export async function generateImages({ prompt, count = 3 }) {
  if (!prompt?.trim()) throw new Error('There is no prompt to generate from.')

  const results = await Promise.allSettled(
    Array.from({ length: Math.min(Math.max(count, 1), 4) }, () => openaiImage(prompt)),
  )

  const images = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => `data:image/png;base64,${r.value.toString('base64')}`)

  if (!images.length) {
    const reason = results.find((r) => r.status === 'rejected')?.reason
    throw new Error(reason?.message ?? 'No images could be generated.')
  }

  return { images, failed: results.length - images.length }
}

/** Turns a data URL from the browser back into bytes. */
function decodeDataUrl(dataUrl) {
  const match = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(String(dataUrl ?? ''))
  if (!match) throw new Error('That is not an image we generated.')
  const buffer = Buffer.from(match[1], 'base64')
  if (!buffer.length) throw new Error('The image was empty.')
  return buffer
}

/**
 * Three variations of one chosen image, following a written change.
 *
 * Same parallel-and-settle behaviour as generation: a refusal on one of three
 * should not cost the other two.
 */
export async function varyImage({ dataUrl, instruction, count = 3 }) {
  if (!instruction?.trim()) throw new Error('Describe what to change.')
  const base = decodeDataUrl(dataUrl)

  const results = await Promise.allSettled(
    Array.from({ length: Math.min(Math.max(count, 1), 4) }, () => openaiEdit(base, instruction)),
  )

  const images = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => `data:image/png;base64,${r.value.toString('base64')}`)

  if (!images.length) {
    const reason = results.find((r) => r.status === 'rejected')?.reason
    throw new Error(reason?.message ?? 'No variations could be generated.')
  }

  return { images, failed: results.length - images.length }
}

/** Stores the chosen option through the same pipeline as an upload. */
export async function saveGeneratedImage({ dataUrl, slug = 'article' }) {
  const res = await saveImageBuffer(decodeDataUrl(dataUrl), { slug })
  if (res.error) throw new Error(res.error)
  return res
}
