/**
 * Creates or updates an admin user.
 *
 *   npm run admin:create-user -- brad@royalwoodshop.com "a good password" "Brad Gerrits"
 */
import { eq } from 'drizzle-orm'
import { getDb } from '../src/lib/db.server.js'
import { hashPassword } from '../src/lib/auth.server.js'
import { users } from '../src/db/schema.js'

const [email, password, name] = process.argv.slice(2)
if (!email || !password) {
  console.error('usage: npm run admin:create-user -- <email> <password> [name]')
  process.exit(1)
}
if (password.length < 10) {
  console.error('password must be at least 10 characters')
  process.exit(1)
}

const db = await getDb()
const passwordHash = await hashPassword(password)
const values = { email: email.trim().toLowerCase(), passwordHash, name: name ?? null, role: 'admin' }

const [user] = await db.insert(users).values(values)
  .onConflictDoUpdate({ target: users.email, set: { passwordHash, name: values.name } })
  .returning({ id: users.id, email: users.email })

console.log(`admin user ready: ${user.email} (id ${user.id})`)
process.exit(0)
