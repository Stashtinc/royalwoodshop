/**
 * Records development work in the activity log, from the git history.
 *
 *   npm run log:build            everything not yet recorded
 *   npm run log:build -- --since 2026-08-14
 *
 * The activity log was built to answer "what changed on the site, and who
 * changed it" — content edited through the admin. Development is a different
 * kind of change and lives in git, which is why building the blog editor left
 * no trace in a log that faithfully recorded a single article being published.
 *
 * For a project being reported on to a client, one timeline is more useful than
 * two. This copies commits in as `build.shipped` entries, using the real commit
 * time and hash, so the log stays a record of things that actually happened
 * rather than a story assembled afterwards.
 *
 * Idempotent: the hash is stored, and commits already present are skipped.
 */
import 'dotenv/config'
import { execSync } from 'node:child_process'
import { sql } from 'drizzle-orm'
import { getDb } from '../src/lib/db.server.js'
import { activityLog } from '../src/db/schema.js'

const args = process.argv.slice(2)
const sinceFlag = args.indexOf('--since')
const since = sinceFlag !== -1 ? args[sinceFlag + 1] : null

/** Housekeeping commits are noise in a log meant to show progress. */
const SKIP = /^(chore|wip|typo|merge branch|revert)\b/i

const RECORD = ''   // record separator, so subjects containing | are safe
const FIELD = ''

let raw
try {
  raw = execSync(
    `git log --reverse ${since ? `--since=${since}` : ''} --pretty=format:%H${FIELD}%aI${FIELD}%an${FIELD}%s${RECORD}`,
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  )
} catch (e) {
  console.error(`\nCould not read the git history: ${e.message}\n`)
  process.exit(1)
}

const commits = raw.split(RECORD).map((r) => r.trim()).filter(Boolean).map((r) => {
  const [hash, date, author, subject] = r.split(FIELD)
  return { hash, date, author, subject }
})

if (!commits.length) {
  console.log('\nNo commits found.\n')
  process.exit(0)
}

const db = await getDb()

// One query rather than one per commit.
const existing = await db
  .select({ d: activityLog.details })
  .from(activityLog)
  .where(sql`${activityLog.action} = 'build.shipped'`)
// Rows written before the hash length was fixed hold a 10-character hash, so
// both forms are collected and both are checked. Comparing one length against
// the other is exactly what duplicated every commit once already.
const already = new Set()
for (const r of existing) {
  try {
    const d = JSON.parse(r.d)
    if (d?.hash) already.add(d.hash)
    if (d?.short) already.add(d.short)
  } catch { /* a row with unreadable details is not worth failing over */ }
}
const seen = (hash) => already.has(hash) || already.has(hash.slice(0, 10))

let added = 0, skipped = 0
for (const c of commits) {
  if (seen(c.hash)) { skipped++; continue }
  if (SKIP.test(c.subject)) { skipped++; continue }

  await db.insert(activityLog).values({
    userId: null,
    userEmail: null,
    action: 'build.shipped',
    level: 'milestone',
    entityType: 'build',
    entityLabel: c.subject.slice(0, 300),
    // Full hash, since this is what the skip check compares against. Storing
    // the short form here and comparing the long one silently duplicated
    // every commit on the second run.
    details: JSON.stringify({ hash: c.hash, short: c.hash.slice(0, 10), author: c.author }),
    // The real commit time, so the log reads as history rather than as a
    // batch of entries that all appeared the moment this script was run.
    createdAt: new Date(c.date),
  })
  added++
}

console.log(`\n${added} recorded, ${skipped} already present or skipped as housekeeping.\n`)
process.exit(0)
