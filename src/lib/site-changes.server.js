import { and, desc, eq, gt, inArray, notLike, or } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { activityLog, products } from '../db/schema.js'
import { ACTION_LABEL } from './activity-labels.js'

/**
 * Product changes made on the website since the Master was last downloaded or
 * imported — what a fresh download carries that the last sheet did not.
 * Shown on the Import page when Download Master is clicked.
 */
export async function siteChangesSinceSheet() {
  const db = await getDb()
  const [base] = await db.select({ at: activityLog.createdAt, by: activityLog.userEmail, action: activityLog.action })
    .from(activityLog)
    .where(or(eq(activityLog.action, 'master.downloaded'), eq(activityLog.action, 'import.species')))
    .orderBy(desc(activityLog.createdAt)).limit(1)

  // Nothing to compare with yet: the last 30 days.
  const since = base?.at ?? new Date(Date.now() - 30 * 864e5)
  const rows = await db.select().from(activityLog)
    .where(and(
      eq(activityLog.entityType, 'product'),
      notLike(activityLog.action, 'import%'),
      gt(activityLog.createdAt, since),
    ))
    .orderBy(activityLog.createdAt)
    .limit(1000)

  const byProduct = new Map()
  const bulk = []
  for (const r of rows) {
    const d = r.details ? JSON.parse(r.details) : null
    if (!r.entityId) {
      bulk.push({ label: r.entityLabel || ACTION_LABEL[r.action] || r.action, at: r.createdAt, by: r.userEmail })
      continue
    }
    if (!byProduct.has(r.entityId)) {
      byProduct.set(r.entityId, { id: r.entityId, name: r.entityLabel, fields: {}, notes: [], by: new Set(), at: r.createdAt })
    }
    const p = byProduct.get(r.entityId)
    p.at = r.createdAt
    if (r.userEmail) p.by.add(r.userEmail)
    const changed = r.action === 'product.status' && d ? [{ field: 'status', from: d.from, to: d.to }] : d?.changed
    if (Array.isArray(changed)) {
      for (const c of changed) {
        // First "from" and last "to", so several edits to one field read as one change.
        if (p.fields[c.field]) p.fields[c.field].to = c.to
        else p.fields[c.field] = { from: c.from, to: c.to }
      }
    } else {
      const label = ACTION_LABEL[r.action] ?? r.action
      if (!p.notes.includes(label)) p.notes.push(label)
    }
  }

  // Drop non-changes (e.g. an unticked box logged as false → empty).
  const blank = (v) => v == null || ['false', '', '—', 'null'].includes(String(v).trim())
  for (const [id, p] of byProduct) {
    for (const [k, v] of Object.entries(p.fields)) {
      if (String(v.from) === String(v.to) || (blank(v.from) && blank(v.to))) delete p.fields[k]
    }
    if (!Object.keys(p.fields).length && !p.notes.length) byProduct.delete(id)
  }

  const ids = [...byProduct.keys()]
  const current = ids.length
    ? await db.select({ id: products.id, code: products.productCode, name: products.name }).from(products).where(inArray(products.id, ids))
    : []
  const now = new Map(current.map((c) => [c.id, c]))

  const items = [...byProduct.values()]
    .map((p) => ({
      ...p,
      code: now.get(p.id)?.code ?? null,
      name: now.get(p.id)?.name ?? p.name,
      deleted: !now.has(p.id),
      by: [...p.by],
    }))
    .sort((a, b) => new Date(b.at) - new Date(a.at))

  return {
    since: base ? { at: base.at, by: base.by, kind: base.action === 'master.downloaded' ? 'download' : 'import' } : null,
    items,
    bulk: bulk.reverse(),
  }
}
