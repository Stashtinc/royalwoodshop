/**
 * Changes an admin user's email address.
 *
 *   npm run admin:rename -- chrisgrafix77@gmail.com
 *   npm run admin:rename -- new@example.com old@example.com
 *   npm run admin:rename -- new@example.com --name "Christian Beckermann"
 *
 * The activity log stores the email alongside every entry, denormalised, so
 * that history survives a user being deleted. That means a rename has to rewrite
 * those rows too — otherwise the log shows one person as two, and the roll-up
 * that groups nearby entries stops grouping them.
 *
 * Rows are matched on user id, not the old email, so entries written under an
 * earlier address are caught as well.
 */
import { eq, sql } from 'drizzle-orm'
import { getDb } from '../src/lib/db.server.js'
import { users, activityLog } from '../src/db/schema.js'

const args = process.argv.slice(2)
const nameFlag = args.indexOf('--name')
const name = nameFlag !== -1 ? args[nameFlag + 1] : null
// Guard the -1 case: without it, `nameFlag + 1` is 0 and this drops the first
// positional argument.
const positional = args.filter((a, i) =>
  nameFlag === -1 ? true : i !== nameFlag && i !== nameFlag + 1)
const [newEmailRaw, oldEmailRaw] = positional

function die(message, hint) {
  console.error(`\n\x1b[31m${message}\x1b[0m`)
  if (hint) console.error(`\n${hint}`)
  console.error('')
  process.exit(1)
}

if (!newEmailRaw) {
  die('usage: npm run admin:rename -- <new-email> [old-email] [--name "Full Name"]')
}

const newEmail = newEmailRaw.trim().toLowerCase()
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) die(`"${newEmailRaw}" is not an email address.`)

const db = await getDb()
const all = await db.select({
  id: users.id, email: users.email, name: users.name, role: users.role,
}).from(users)

if (!all.length) {
  die('There are no users in the database.',
    'Create one first:  npm run admin:create-user -- <email> <password> "Name"')
}

// Which user are we renaming?
let target
if (oldEmailRaw) {
  const old = oldEmailRaw.trim().toLowerCase()
  target = all.find((u) => u.email === old)
  if (!target) {
    die(`No user with the address "${old}".`,
      `Existing users:\n${all.map((u) => `    ${u.email} (${u.role})`).join('\n')}`)
  }
} else if (all.length === 1) {
  target = all[0]
} else {
  const admins = all.filter((u) => u.role === 'admin')
  if (admins.length !== 1) {
    die('More than one user — say which one to rename.',
      `Existing users:\n${all.map((u) => `    ${u.email} (${u.role})`).join('\n')}\n\n` +
      `    npm run admin:rename -- ${newEmail} <old-email>`)
  }
  target = admins[0]
}

if (target.email === newEmail && !name) {
  console.log(`\nNothing to do — ${newEmail} is already the address.\n`)
  process.exit(0)
}

const clash = all.find((u) => u.email === newEmail && u.id !== target.id)
if (clash) {
  die(`Another user already uses ${newEmail}.`,
    'Email addresses must be unique. Delete or rename that user first.')
}

console.log(`\n  ${target.email}  →  ${newEmail}`)
if (name) console.log(`  name: ${target.name ?? '(none)'}  →  ${name}`)

await db.update(users)
  .set({ email: newEmail, ...(name ? { name } : {}) })
  .where(eq(users.id, target.id))
console.log('  ✓ user updated')

// Bring the history along.
const rewritten = await db.update(activityLog)
  .set({ userEmail: newEmail })
  .where(eq(activityLog.userId, target.id))
  .returning({ id: activityLog.id })
console.log(`  ✓ ${rewritten.length} activity log entr${rewritten.length === 1 ? 'y' : 'ies'} rewritten`)

// Entries written before user ids were recorded, or by an import, match on the
// old address instead.
const orphaned = await db.update(activityLog)
  .set({ userEmail: newEmail })
  .where(sql`${activityLog.userId} is null and lower(${activityLog.userEmail}) = ${target.email}`)
  .returning({ id: activityLog.id })
if (orphaned.length) {
  console.log(`  ✓ ${orphaned.length} older entr${orphaned.length === 1 ? 'y' : 'ies'} matched by address`)
}

await db.insert(activityLog).values({
  userId: target.id,
  userEmail: newEmail,
  action: 'user.renamed',
  level: 'milestone',
  entityType: 'user',
  entityId: target.id,
  entityLabel: newEmail,
  details: JSON.stringify({ from: target.email, to: newEmail }),
})
console.log('  ✓ recorded in the activity log')

console.log(`\n\x1b[32mDone.\x1b[0m Sign in with ${newEmail} — the password is unchanged.\n`)
process.exit(0)
