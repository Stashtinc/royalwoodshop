import { eq, inArray, and } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { products, quoteRequests, quoteItems, quoteFiles } from '../db/schema.js'
import { isMultiple, formatIncrement } from './purchase-increment.js'

/**
 * The Get a Quote form: a serious project enquiry.
 *
 * A request is a contact (name, company, email, phone), a list of product
 * lines picked from the catalogue, optional project notes, and attached files
 * (PDF plans, door schedules and spreadsheets, photos).
 *
 * Everything is written to the database before the email is sent, as with the
 * contact form. Files live in the database rather than public/uploads, because
 * they are customer documents. Email goes to the same inbox as the contact
 * form (CONTACT_TO), with the files attached, so the team can work from it
 * without logging in anywhere.
 */

const LIMITS = { name: 160, company: 160, email: 254, phone: 40, notes: 2000, note: 300 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_ITEMS = 200
const MAX_FILES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024
/** Kept well under the email provider's attachment limit once base64 encoded. */
const MAX_TOTAL_BYTES = 15 * 1024 * 1024
const MAX_QTY = 9999

const ALLOWED_EXT = new Set(['pdf', 'xls', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'webp'])

const extOf = (name) => name.split('.').pop().toLowerCase()

/** Returns { values, items, files, errors }. Items are only what the form sent;
 *  the server looks each product up before anything is saved. */
export function validateQuote(form) {
  const get = (k, max) => String(form.get(k) ?? '').trim().slice(0, max)
  const values = {
    name: get('name', LIMITS.name),
    company: get('company', LIMITS.company),
    email: get('email', LIMITS.email),
    phone: get('phone', LIMITS.phone),
    notes: get('notes', LIMITS.notes),
  }
  const errors = {}

  if (!values.name) errors.name = 'Please enter your name.'
  if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.'
  if (values.phone.replace(/\D/g, '').length < 7) errors.phone = 'Please enter a phone number we can reach you on.'

  let items = []
  try {
    const raw = JSON.parse(String(form.get('items') ?? '[]'))
    if (!Array.isArray(raw) || raw.length > MAX_ITEMS) throw new Error('bad items')
    items = raw.map((r) => ({
      productId: Number.parseInt(r?.productId, 10),
      quantity: Number.parseInt(r?.quantity, 10),
      note: String(r?.note ?? '').trim().slice(0, LIMITS.note),
    }))
  } catch {
    errors.items = 'Your product list could not be read. Please remove the products and add them again.'
  }
  if (items.some((i) => !Number.isInteger(i.productId) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QTY)) {
    errors.items = `Quantities must be whole numbers from 1 to ${MAX_QTY}.`
  }

  const files = form.getAll('files').filter((f) => typeof f !== 'string' && f.size > 0)
  if (files.length > MAX_FILES) errors.files = `Attach up to ${MAX_FILES} files.`
  for (const f of files) {
    if (!ALLOWED_EXT.has(extOf(f.name))) {
      errors.files = `${f.name}: we accept PDF, Excel, CSV, and image files (JPG, PNG, WebP).`
      break
    }
    if (f.size > MAX_FILE_BYTES) {
      errors.files = `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit per file is ${MAX_FILE_BYTES / 1024 / 1024} MB.`
      break
    }
  }
  if (!errors.files && files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) {
    errors.files = `Attachments add up to more than ${MAX_TOTAL_BYTES / 1024 / 1024} MB. Please send the rest separately.`
  }

  if (!errors.items && !items.length && !files.length && values.notes.length < 5) {
    errors.items = 'Add at least one product, attach a file, or tell us about your project.'
  }

  return { values, items, files, errors }
}

/** Honeypot: a field real visitors never see. Bots fill every input. */
export const isBot = (form) => String(form.get('website_url') ?? '').trim() !== ''

/** Looks each requested product up, so the saved line carries the code and
 *  name as they were at the time, and only published products can be quoted. */
export async function resolveItems(items) {
  if (!items.length) return { lines: [], errors: null }
  const db = await getDb()
  const ids = [...new Set(items.map((i) => i.productId))]
  const rows = await db.select({
    id: products.id, name: products.name, productCode: products.productCode, uom: products.uom,
    purchaseIncrement: products.purchaseIncrement,
  }).from(products).where(and(inArray(products.id, ids), eq(products.status, 'published')))
  const byId = new Map(rows.map((r) => [r.id, r]))
  if (byId.size !== ids.length) {
    return { lines: null, errors: { items: 'One of the products is no longer available. Please remove it and try again.' } }
  }
  // A linear-foot product is bought in whole multiples of its purchase increment.
  for (const i of items) {
    const row = byId.get(i.productId)
    const increment = row.purchaseIncrement == null ? null : Number(row.purchaseIncrement)
    if (!isMultiple(i.quantity, increment)) {
      const step = formatIncrement(increment)
      return {
        lines: null,
        errors: { items: `${row.name} is bought in multiples of ${step}. Please set its quantity to ${step}, ${Number(step) * 2} or another multiple of ${step}.` },
      }
    }
  }
  return {
    lines: items.map((i, position) => ({
      productId: i.productId,
      productCode: byId.get(i.productId).productCode,
      productName: byId.get(i.productId).name,
      uom: byId.get(i.productId).uom,
      quantity: i.quantity,
      note: i.note || null,
      position,
    })),
    errors: null,
  }
}

export async function saveAndNotify(values, lines, files, { ip } = {}) {
  let id = null
  try {
    const db = await getDb()
    id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(quoteRequests)
        .values({ ...values, company: values.company || null, notes: values.notes || null, ip: ip?.slice(0, 64) || null })
        .returning({ id: quoteRequests.id })
      if (lines.length) await tx.insert(quoteItems).values(lines.map((l) => ({ ...l, requestId: row.id })))
      if (files.length) {
        await tx.insert(quoteFiles).values(files.map((f) => ({
          requestId: row.id, filename: f.filename, contentType: f.contentType, sizeBytes: f.data.length, data: f.data,
        })))
      }
      return row.id
    })
  } catch (e) {
    // Still try to email. Losing the copy is bad; losing the enquiry is worse.
    console.error('[quote] could not save request:', e.message)
  }

  const sent = await sendEmail(values, lines, files)
  if (id) {
    try {
      const db = await getDb()
      await db.update(quoteRequests)
        .set(sent.ok ? { emailedAt: new Date() } : { emailError: sent.error })
        .where(eq(quoteRequests.id, id))
    } catch { /* the request itself is saved; the status is secondary */ }
  }

  return { ok: Boolean(id) || sent.ok }
}

async function sendEmail(values, lines, files) {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[quote] SMTP_HOST is not set; request saved but not emailed')
    }
    return { ok: false, error: 'SMTP not configured' }
  }
  try {
    const nodemailer = (await import('nodemailer')).default
    const port = Number(process.env.SMTP_PORT || 587)
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })

    const itemLines = lines.length
      ? lines.map((l) => `- ${l.quantity} × ${l.productName}${l.productCode ? ` (${l.productCode})` : ''}${l.uom ? ` [${l.uom}]` : ''}${l.note ? ` — ${l.note}` : ''}`)
      : ['(none selected)']

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_TO || 'info@royalwoodshop.com',
      replyTo: `"${values.name.replace(/"/g, '')}" <${values.email}>`,
      subject: `Quote request from ${values.name}${values.company ? ` (${values.company})` : ''}`,
      text: [
        `Name: ${values.name}`,
        `Company: ${values.company || '—'}`,
        `Email: ${values.email}`,
        `Phone: ${values.phone}`,
        '',
        'Products:',
        ...itemLines,
        '',
        'Project notes:',
        values.notes || '—',
        '',
        `Attachments: ${files.length ? files.map((f) => f.filename).join(', ') : 'none'}`,
        '',
        '— Sent from the Get a Quote form on royalwoodshop.com',
      ].join('\n'),
      attachments: files.map((f) => ({ filename: f.filename, content: f.data, contentType: f.contentType })),
    })
    return { ok: true }
  } catch (e) {
    console.error('[quote] email failed:', e.message)
    return { ok: false, error: e.message.slice(0, 500) }
  }
}

/** Reads uploaded files into memory for storage and the email. */
export async function readFiles(files) {
  return Promise.all(files.map(async (f) => ({
    filename: f.name.slice(0, 255),
    contentType: f.type || 'application/octet-stream',
    data: Buffer.from(await f.arrayBuffer()),
  })))
}
