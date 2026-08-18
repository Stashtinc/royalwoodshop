/**
 * Records development work in the activity log, read from the git history.
 *
 * Lives here rather than in the script so the admin button and the command
 * line run exactly the same code. It also means the button runs inside the
 * web server's own process, which matters more than it sounds: the embedded
 * database allows a single writer, so a separate script opening it while the
 * server is running is what crashes the server. A button cannot do that.
 */
import { execFileSync } from 'node:child_process'
import { sql } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { activityLog } from '../db/schema.js'

export const BUILD_ACTION = 'build.shipped'

/** Housekeeping commits are noise in a log meant to show progress. */
const SKIP = /^(chore|wip|typo|merge branch|revert)\b/i

const RECORD = ''
const FIELD = ''

function readCommits(since) {
  const args = ['log', '--reverse', `--pretty=format:%H${FIELD}%aI${FIELD}%an${FIELD}%s${RECORD}`]
  if (since) args.splice(2, 0, `--since=${since}`)

  let raw
  try {
    raw = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  } catch (e) {
    throw new Error(
      `Could not read the project history: ${e.message.split('\n')[0]}. ` +
      'This needs to run where the git repository is — on a server that only has ' +
      'the built site, there is no history to read.',
    )
  }

  return raw.split(RECORD).map((r) => r.trim()).filter(Boolean).map((r) => {
    const [hash, date, author, subject] = r.split(FIELD)
    return { hash, date, author, subject }
  })
}

/**
 * Copies any commit not already recorded. Idempotent: the hash is stored and
 * checked, in both the full and short forms, since rows written before the
 * length was fixed hold ten characters.
 */
export async function recordBuilds({ since = null } = {}) {
  const commits = readCommits(since)
  if (!commits.length) return { added: 0, skipped: 0, total: 0 }

  const db = await getDb()
  const existing = await db
    .select({ d: activityLog.details })
    .from(activityLog)
    .where(sql`${activityLog.action} = ${BUILD_ACTION}`)

  const already = new Set()
  for (const r of existing) {
    try {
      const d = JSON.parse(r.d)
      if (d?.hash) already.add(d.hash)
      if (d?.short) already.add(d.short)
    } catch { /* an unreadable row is not worth failing over */ }
  }
  const seen = (hash) => already.has(hash) || already.has(hash.slice(0, 10))

  let added = 0, skipped = 0
  for (const c of commits) {
    if (seen(c.hash) || SKIP.test(c.subject)) { skipped++; continue }
    await db.insert(activityLog).values({
      userId: null,
      userEmail: null,
      action: BUILD_ACTION,
      level: 'milestone',
      entityType: 'build',
      entityLabel: c.subject.slice(0, 300),
      details: JSON.stringify({ hash: c.hash, short: c.hash.slice(0, 10), author: c.author }),
      // The real commit time, so the log reads as history rather than as a
      // batch of entries that all appeared the moment this was run.
      createdAt: new Date(c.date),
    })
    added++
  }

  return { added, skipped, total: commits.length }
}
