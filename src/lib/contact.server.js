import { count, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { contactMessages } from '../db/schema.js'

/**
 * The public contact form.
 *
 * Every enquiry is written to the database before any email is attempted, so
 * a mail-server outage or a missing setting never loses a customer — the
 * message is still there to read. Email is the notification, not the record.
 *
 * Email goes out over plain SMTP so any provider works (Google Workspace,
 * Microsoft 365, the host's own mail server, Resend, Postmark…):
 *
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS
 *   SMTP_FROM   the sender, e.g. "Royal Wood Shop website <web@royalwoodshop.com>"
 *   CONTACT_TO  who receives enquiries (default info@royalwoodshop.com)
 */

const LIMITS = { name: 160, email: 254, phone: 40, message: 5000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns { values, errors }. Values are trimmed and length-capped. */
export function validateContact(form) {
  const get = (k) => String(form.get(k) ?? '').trim().slice(0, LIMITS[k])
  const values = { name: get('name'), email: get('email'), phone: get('phone'), message: get('message') }
  const errors = {}
  if (!values.name) errors.name = 'Please enter your name.'
  if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.'
  if (values.message.length < 5) errors.message = 'Please tell us a little about your project.'
  return { values, errors }
}

/** Honeypot: a field real visitors never see. Bots fill every input. */
export const isBot = (form) => String(form.get('company') ?? '').trim() !== ''

export async function saveAndNotify(values, { ip } = {}) {
  let id = null
  try {
    const db = await getDb()
    const [row] = await db.insert(contactMessages)
      .values({ ...values, phone: values.phone || null, ip: ip?.slice(0, 64) || null })
      .returning({ id: contactMessages.id })
    id = row.id
  } catch (e) {
    // Still try to email — losing the copy is bad, losing the enquiry is worse.
    console.error('[contact] could not save message:', e.message)
  }

  const sent = await sendEmail(values)
  if (id) {
    try {
      const db = await getDb()
      await db.update(contactMessages)
        .set(sent.ok ? { emailedAt: new Date() } : { emailError: sent.error })
        .where(eq(contactMessages.id, id))
    } catch { /* the message itself is saved; the status is secondary */ }
  }

  // The visitor sees success if the enquiry reached us by either route.
  return { ok: Boolean(id) || sent.ok }
}

/**
 * What the admin Messages page shows about the email setup. Names only —
 * never the values — so nothing secret reaches the browser.
 */
export function emailSettings() {
  const has = (k) => Boolean(process.env[k]?.trim())
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
  const missing = required.filter((k) => !has(k))
  return {
    ready: missing.length === 0,
    missing,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    to: process.env.CONTACT_TO || 'info@royalwoodshop.com',
  }
}

export async function listMessages({ page = 1, perPage = 25 } = {}) {
  const db = await getDb()
  const [{ total }] = await db.select({ total: count() }).from(contactMessages)
  const [{ unsent }] = await db.select({ unsent: count() }).from(contactMessages).where(isNull(contactMessages.emailedAt))
  const pages = Math.max(1, Math.ceil(total / perPage))
  page = Math.min(Math.max(1, page), pages)
  const rows = await db.select().from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(perPage).offset((page - 1) * perPage)
  return { rows, total, unsent, page, pages, perPage }
}

/** Emails a saved enquiry again (e.g. ones that arrived before email was set up). */
export async function resendMessage(id) {
  const db = await getDb()
  const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, id))
  if (!row) return { ok: false, error: 'Message not found' }
  const sent = await sendEmail(row)
  await db.update(contactMessages)
    .set(sent.ok ? { emailedAt: new Date(), emailError: null } : { emailError: sent.error })
    .where(eq(contactMessages.id, id))
  return sent
}

/** A test email to the enquiry inbox, so the setup can be checked without using the public form. */
export async function sendTestEmail(byEmail) {
  return sendEmail({
    name: 'Website test',
    email: byEmail || process.env.SMTP_USER || 'info@royalwoodshop.com',
    phone: '',
    message: 'This is a test from the website admin (Messages → Send test email). If you can read this, contact form enquiries will reach this inbox.',
  }, { subject: 'Test: website contact form email is working' })
}

async function sendEmail({ name, email, phone, message }, { subject } = {}) {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[contact] SMTP_HOST is not set — enquiry saved but not emailed')
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
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s+/g, '') } : undefined,
      connectionTimeout: 15000,
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_TO || 'info@royalwoodshop.com',
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: subject || `Website enquiry from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || '—'}`,
        '',
        message,
        '',
        '— Sent from the contact form on royalwoodshop.com',
      ].join('\n'),
    })
    return { ok: true }
  } catch (e) {
    console.error('[contact] email failed:', e.message)
    return { ok: false, error: e.message.slice(0, 500) }
  }
}
