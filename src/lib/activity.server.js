import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { activityLog } from '../db/schema.js'

/**
 * What counts as a milestone.
 *
 * Anything that changed many things at once, or changed what a customer sees.
 * Everything else is detail: one field, one image, one sign-in. Detail is still
 * recorded — it just does not shout.
 */
const MILESTONE_ACTIONS = new Set([
  'import.species',
  'site.published',
  'product.created',
  'product.archived',
  'product.restored',
  'product.status',
  'setup.catalogue',
  'setup.redirects',
  'setup.schema',
  'setup.posts',
  'post.published',
  'post.created',
  'user.renamed',
  'image.generated',
  'build.shipped',
])

export const levelFor = (action) => (MILESTONE_ACTIONS.has(action) ? 'milestone' : 'detail')

/** Records a change. Never throws — failing to write history must not prevent
 *  the change itself from being saved. */
export async function log(user, action, { entityType, entityId, entityLabel, details, level } = {}) {
  try {
    const db = await getDb()
    await db.insert(activityLog).values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action,
      level: level ?? levelFor(action),
      entityType: entityType ?? null,
      entityId: entityId ? Number(entityId) : null,
      entityLabel: entityLabel ? String(entityLabel).slice(0, 300) : null,
      details: details ? JSON.stringify(details) : null,
    })
  } catch (e) {
    console.error('activity log write failed:', e.message)
  }
}

const parse = (r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null })

/**
 * Collapses a run of individual product edits by one person into a single
 * line. Forty separate "edited a product" entries is not history, it is noise;
 * "edited 40 products over half an hour" is.
 */
const ROLLUP_GAP_MS = 45 * 60 * 1000

function rollUp(rows) {
  const out = []
  for (const row of rows) {
    const last = out.at(-1)
    const canGroup =
      last?.action === row.action &&
      row.action === 'product.updated' &&
      last.userEmail === row.userEmail &&
      Math.abs(new Date(last.oldest ?? last.createdAt) - new Date(row.createdAt)) < ROLLUP_GAP_MS

    if (canGroup) {
      last.group = last.group ?? [last]
      last.group.push(row)
      last.oldest = row.createdAt
      continue
    }
    out.push({ ...row })
  }
  return out
}

/**
 * Views, not levels.
 *
 *   content      what changed on the site — milestones, excluding development
 *   development  commits, recorded by npm run log:build
 *   all          everything, in one timeline
 *
 * Development is milestone-level because it is significant, but it answers a
 * different question from "did my catalogue change", so it gets its own view
 * rather than burying content under it.
 */
export const BUILD_ACTION = 'build.shipped'

export async function listActivity({ page = 1, perPage = 50, level = 'content', action = '' } = {}) {
  const db = await getDb()
  const where = []
  if (level === 'content') {
    where.push(eq(activityLog.level, 'milestone'))
    where.push(ne(activityLog.action, BUILD_ACTION))
  }
  if (level === 'development') where.push(eq(activityLog.action, BUILD_ACTION))
  if (action) where.push(eq(activityLog.action, action))
  const clause = where.length ? and(...where) : undefined

  const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(activityLog).where(clause)
  const rows = await db.select().from(activityLog).where(clause)
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(perPage).offset((page - 1) * perPage)

  return {
    rows: rollUp(rows.map(parse)),
    total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function counts() {
  const db = await getDb()
  const [r] = await db.select({
    content: sql`count(*) filter (where ${activityLog.level} = 'milestone' and ${activityLog.action} <> ${BUILD_ACTION})::int`,
    development: sql`count(*) filter (where ${activityLog.action} = ${BUILD_ACTION})::int`,
    all: sql`count(*)::int`,
  }).from(activityLog)
  return r
}

export async function listActions(level) {
  const db = await getDb()
  const clause = level === 'content'
    ? and(eq(activityLog.level, 'milestone'), ne(activityLog.action, BUILD_ACTION))
    : level === 'development'
      ? eq(activityLog.action, BUILD_ACTION)
      : undefined
  return db.select({ action: activityLog.action, n: sql`count(*)::int` })
    .from(activityLog)
    .where(clause)
    .groupBy(activityLog.action).orderBy(activityLog.action)
}

/**
 * Removes detailed entries older than 90 days. Milestones are kept.
 * Called on the logs page, so it needs no scheduler.
 */
export async function pruneDetail(days = 90) {
  try {
    const db = await getDb()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    await db.delete(activityLog)
      .where(and(eq(activityLog.level, 'detail'), lt(activityLog.createdAt, cutoff)))
  } catch (e) {
    console.error('activity prune failed:', e.message)
  }
}
