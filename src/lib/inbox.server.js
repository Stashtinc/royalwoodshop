import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { contactMessages, quoteRequests, quoteItems, quoteFiles } from '../db/schema.js'

/**
 * The admin inbox: every website enquiry and Get a Quote request in one list,
 * newest first. Each row says whether its notification email was sent, so
 * anyone can see at a glance if a message needs following up by phone.
 *
 * kind: 'enquiry' (contact, consultation and material estimate forms) or 'quote'.
 */
const LIMIT = 100

/** Which form an enquiry came from, from the tag written when it was saved. */
function enquirySource(message) {
  const tag = /^\[([^\]]+)\]/.exec(message ?? '')
  return tag ? tag[1] : 'Website enquiry'
}

function emailStatus(row) {
  if (row.emailedAt) return { state: 'sent', label: 'Sent' }
  if (row.emailError) return { state: 'failed', label: 'Failed' }
  return { state: 'none', label: 'Not emailed' }
}

export async function listInbox() {
  const db = await getDb()
  const [enquiries, quotes] = await Promise.all([
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(LIMIT),
    db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt)).limit(LIMIT),
  ])
  const rows = [
    ...enquiries.map((r) => ({
      kind: 'enquiry',
      id: r.id,
      type: enquirySource(r.message),
      name: r.name,
      email: r.email,
      createdAt: r.createdAt,
      status: emailStatus(r),
    })),
    ...quotes.map((r) => ({
      kind: 'quote',
      id: r.id,
      type: 'Quote request',
      name: r.name,
      email: r.email,
      createdAt: r.createdAt,
      status: emailStatus(r),
    })),
  ]
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return rows.slice(0, LIMIT)
}

export async function getInboxItem(kind, id) {
  const db = await getDb()
  if (kind === 'enquiry') {
    const [r] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
    if (!r) return null
    return {
      kind,
      id: r.id,
      type: enquirySource(r.message),
      name: r.name,
      email: r.email,
      phone: r.phone,
      message: r.message.replace(/^\[[^\]]+\]\n?/, ''),
      createdAt: r.createdAt,
      status: emailStatus(r),
      emailError: r.emailError,
      items: [],
      files: [],
    }
  }
  if (kind === 'quote') {
    const [r] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1)
    if (!r) return null
    const items = await db.select().from(quoteItems).where(eq(quoteItems.requestId, id)).orderBy(quoteItems.position)
    // File contents stay in the database; only the list is read here.
    const files = await db.select({
      id: quoteFiles.id, filename: quoteFiles.filename, sizeBytes: quoteFiles.sizeBytes, contentType: quoteFiles.contentType,
    }).from(quoteFiles).where(eq(quoteFiles.requestId, id))
    return {
      kind,
      id: r.id,
      type: 'Quote request',
      name: r.name,
      company: r.company,
      email: r.email,
      phone: r.phone,
      message: r.notes,
      createdAt: r.createdAt,
      status: emailStatus(r),
      emailError: r.emailError,
      items,
      files,
    }
  }
  return null
}

export async function getQuoteFile(id) {
  const db = await getDb()
  const [f] = await db.select().from(quoteFiles).where(eq(quoteFiles.id, id)).limit(1)
  return f ?? null
}

/**
 * Permanently removes the chosen enquiries and quote requests. A quote's items
 * and attachments go with it (cascade). Returns the number removed.
 */
export async function deleteInboxItems(selected) {
  const db = await getDb()
  const enquiryIds = selected.filter((s) => s.kind === 'enquiry').map((s) => s.id)
  const quoteIds = selected.filter((s) => s.kind === 'quote').map((s) => s.id)
  let removed = 0
  if (enquiryIds.length) {
    const rows = await db.delete(contactMessages).where(inArray(contactMessages.id, enquiryIds)).returning({ id: contactMessages.id })
    removed += rows.length
  }
  if (quoteIds.length) {
    const rows = await db.delete(quoteRequests).where(inArray(quoteRequests.id, quoteIds)).returning({ id: quoteRequests.id })
    removed += rows.length
  }
  return removed
}
