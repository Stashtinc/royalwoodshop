/**
 * Sends the website's emails (the enquiry forms and Get a Quote).
 *
 * Two ways out, picked by which settings are present:
 *
 *   RESEND_API_KEY   Resend, over its web API (HTTPS). Preferred: it works on
 *                    any Railway plan, where outgoing SMTP needs the Pro plan.
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS
 *                    any SMTP server, used when there is no Resend key.
 *
 *   MAIL_FROM        the sender, e.g. "Royal Wood Shop Website <website@royalwoodshop.com>".
 *                    Falls back to SMTP_FROM. With Resend, the domain must be
 *                    verified in Resend (its DNS records added) or it refuses.
 *
 * Never throws: returns { ok: true } or { ok: false, error } so the caller can
 * record the outcome next to the saved enquiry.
 */

const DEFAULT_FROM = 'Royal Wood Shop Website <website@royalwoodshop.com>'
const RESEND_URL = 'https://api.resend.com/emails'

const sender = () => process.env.MAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || DEFAULT_FROM

/**
 * @param {{ to: string, replyTo?: string, subject: string, text: string,
 *           attachments?: { filename: string, content: Buffer, contentType?: string }[] }} mail
 * @param {string} tag  prefix for log lines, e.g. 'contact'
 */
export async function sendMail(mail, tag = 'mail') {
  const key = process.env.RESEND_API_KEY?.trim()
  if (key) return viaResend(mail, key, tag)
  if (process.env.SMTP_HOST?.trim()) return viaSmtp(mail, tag)
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[${tag}] no RESEND_API_KEY or SMTP_HOST set; saved but not emailed`)
  }
  return { ok: false, error: 'Email not configured' }
}

async function viaResend({ to, replyTo, subject, text, attachments = [] }, key, tag) {
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender(),
        // CONTACT_TO may list several addresses, comma-separated.
        to: to.split(',').map((a) => a.trim()).filter(Boolean),
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text,
        ...(attachments.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content).toString('base64'),
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (res.ok) return { ok: true }
    // Resend explains refusals in the body ("domain is not verified", "invalid API key"…).
    const body = await res.text().catch(() => '')
    let detail = body
    try { detail = JSON.parse(body).message || body } catch { /* not JSON */ }
    const error = `Resend ${res.status}: ${detail}`.slice(0, 500)
    console.error(`[${tag}] email failed:`, error)
    return { ok: false, error }
  } catch (e) {
    console.error(`[${tag}] email failed:`, e.message)
    return { ok: false, error: `Resend: ${e.message}`.slice(0, 500) }
  }
}

async function viaSmtp({ to, replyTo, subject, text, attachments = [] }, tag) {
  try {
    const nodemailer = (await import('nodemailer')).default
    const port = Number(process.env.SMTP_PORT || 587)
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({
      from: process.env.MAIL_FROM?.trim() || process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      replyTo,
      subject,
      text,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    })
    return { ok: true }
  } catch (e) {
    console.error(`[${tag}] email failed:`, e.message)
    return { ok: false, error: e.message.slice(0, 500) }
  }
}
