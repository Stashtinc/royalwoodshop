import { eq } from 'drizzle-orm'
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

async function sendEmail({ name, email, phone, message }) {
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
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_TO || 'info@royalwoodshop.com',
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `Website enquiry from ${name}`,
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
