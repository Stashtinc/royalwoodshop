import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { activityLog } from '../db/schema.js'

/**
 * Records a change. Never throws — a failure to write history should not
 * prevent the change itself from being saved.
 */
export async function log(user, action, { entityType, entityId, entityLabel, details } = {}) {
  try {
    const db = await getDb()
    await db.insert(activityLog).values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ? Number(entityId) : null,
      entityLabel: entityLabel ? String(entityLabel).slice(0, 300) : null,
      details: details ? JSON.stringify(details) : null,
    })
  } catch (e) {
    console.error('activity log write failed:', e.message)
  }
}

export async function listActivity({ page = 1, perPage = 50, action = '', entityId = '' } = {}) {
  const db = await getDb()
  const where = []
  if (action) where.push(eq(activityLog.action, action))
  if (entityId) where.push(eq(activityLog.entityId, Number(entityId)))
  const clause = where.length ? sql`${sql.join(where, sql` and `)}` : undefined

  const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(activityLog).where(clause)
  const rows = await db.select().from(activityLog).where(clause)
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(perPage).offset((page - 1) * perPage)

  return {
    rows: rows.map((r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null })),
    total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function listActions() {
  const db = await getDb()
  const rows = await db.select({
    action: activityLog.action,
    n: sql`count(*)::int`,
  }).from(activityLog).groupBy(activityLog.action).orderBy(activityLog.action)
  return rows
}
