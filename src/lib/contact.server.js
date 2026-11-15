import { eq } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { contactMessages } from '../db/schema.js'
import { sendMail } from './mailer.server.js'

/**
 * The public enquiry forms: /contact, and the Consultation and Material
 * Estimate forms on the service pages.
 *
 * Every enquiry is written to the database before any email is attempted, so
 * a mail-server outage or a missing setting never loses a customer — the
 * message is still there to read. Email is the notification, not the record.
 *
 * Email goes out through lib/mailer.server.js: Resend (RESEND_API_KEY) or any
 * SMTP server (SMTP_HOST…), sent from MAIL_FROM. See that file for settings.
 *
 *   CONTACT_TO  who receives enquiries (default sales@royalwoodshop.com)
 */

/** Every website form (contact, service enquiries, Get a Quote) emails here. */
export const DEFAULT_CONTACT_TO = 'sales@royalwoodshop.com'
export const contactTo = () => process.env.CONTACT_TO?.trim() || DEFAULT_CONTACT_TO

/**
 * Where each form came from: the label in the email subject and footer, and
 * the tag on the stored message so the copies can be told apart.
 */
const SOURCES = {
  contact: { subject: 'Website enquiry', footer: 'the contact form' },
  consultation: { subject: 'Consultation request', footer: 'the Consultation page' },
  estimate: { subject: 'Material estimate request', footer: 'the Material Estimate & Quotation page' },
}

const LIMITS = { name: 160, email: 254, phone: 40, message: 5000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Returns { values, errors }. Values are trimmed and length-capped.
 * The service-page forms ask for a phone number and leave the message optional,
 * as the old site's forms did; /contact is the other way round.
 */
export function validateContact(form, { requirePhone = false, requireMessage = true } = {}) {
  const get = (k) => String(form.get(k) ?? '').trim().slice(0, LIMITS[k])
  const values = { name: get('name'), email: get('email'), phone: get('phone'), message: get('message') }
  const errors = {}
  if (!values.name) errors.name = 'Please enter your name.'
  if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.'
  if (requirePhone && values.phone.replace(/\D/g, '').length < 7) errors.phone = 'Please enter a phone number we can reach you on.'
  if (requireMessage && values.message.length < 5) errors.message = 'Please tell us a little about your project.'
  return { values, errors }
}

/** Honeypot: a field real visitors never see. Bots fill every input. */
export const isBot = (form) => String(form.get('company') ?? '').trim() !== ''

export async function saveAndNotify(values, { ip, source = 'contact' } = {}) {
  const from = SOURCES[source] ?? SOURCES.contact
  // contact_messages has no source column; tag the stored copy instead.
  const stored = source === 'contact' ? values.message : `[${from.subject}]\n${values.message}`.trim()
  let id = null
  try {
    const db = await getDb()
    const [row] = await db.insert(contactMessages)
      .values({ ...values, message: stored, phone: values.phone || null, ip: ip?.slice(0, 64) || null })
      .returning({ id: contactMessages.id })
    id = row.id
  } catch (e) {
    // Still try to email — losing the copy is bad, losing the enquiry is worse.
    console.error('[contact] could not save message:', e.message)
  }

  const sent = await sendEmail(values, from)
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
 * The whole form action, shared by /contact and the service pages so they
 * validate, store and email the same way. Service pages pass
 * { requirePhone: true, requireMessage: false } to match their fields.
 */
export async function handleEnquiry(request, { source = 'contact', ...rules } = {}) {
  const form = await request.formData()

  // Pretend success so the bot learns nothing, but store nothing.
  if (isBot(form)) return { ok: true }

  const { values, errors } = validateContact(form, rules)
  if (Object.keys(errors).length) return { errors, values }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  const { ok } = await saveAndNotify(values, { ip, source })
  if (!ok) {
    return {
      values,
      formError: `Sorry — your message could not be sent. Please call us at 905-727-1387 or email ${DEFAULT_CONTACT_TO}.`,
    }
  }
  return { ok: true }
}

function sendEmail({ name, email, phone, message }, from) {
  return sendMail({
    to: contactTo(),
    replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
    subject: `${from.subject} from ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || '—'}`,
      '',
      message || '(no message)',
      '',
      `— Sent from ${from.footer} on royalwoodshop.com`,
    ].join('\n'),
  }, 'contact')
}
