import { createCookieSessionStorage, redirect } from 'react-router'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { users } from '../db/schema.js'

const DEV_SECRET = 'dev-only-insecure-secret-change-me'

/**
 * Cookie storage, created on first use.
 *
 * In production a missing (or placeholder) SESSION_SECRET fails closed: the
 * admin answers 503 instead of signing cookies with a secret that is in the
 * repository, which would let anyone forge an admin session. Public pages are
 * unaffected — the root loader already treats a session error as "not signed
 * in". Created lazily so builds and scripts that never touch a session do not
 * need the secret.
 */
let storage = null
function sessionStorage() {
  if (storage) return storage
  const secret = process.env.SESSION_SECRET?.trim()
  const production = process.env.NODE_ENV === 'production'
  if (production && (!secret || secret === DEV_SECRET)) {
    console.error('SESSION_SECRET is not set — admin sign-in is disabled until it is')
    throw new Response('Admin is unavailable: SESSION_SECRET is not configured on the server.', { status: 503 })
  }
  storage = createCookieSessionStorage({
    cookie: {
      name: 'rws_admin',
      httpOnly: true,          // not readable by JavaScript
      sameSite: 'lax',
      path: '/',
      secure: production,
      maxAge: 60 * 60 * 24 * 14,
      secrets: [secret || DEV_SECRET],
    },
  })
  return storage
}

export const hashPassword = (plain) => bcrypt.hash(plain, 12)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

export async function login(email, password) {
  const db = await getDb()
  const [user] = await db.select().from(users)
    .where(eq(users.email, email.trim().toLowerCase())).limit(1)
  if (!user) return null
  const ok = await verifyPassword(password, user.passwordHash)
  return ok ? user : null
}

export async function createSession(userId, redirectTo = '/admin') {
  const session = await sessionStorage().getSession()
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await sessionStorage().commitSession(session) },
  })
}

export async function getUser(request) {
  const session = await sessionStorage().getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId) return null
  const db = await getDb()
  const [user] = await db.select({
    id: users.id, email: users.email, name: users.name, role: users.role,
  }).from(users).where(eq(users.id, userId)).limit(1)
  return user ?? null
}

/**
 * Where to go after signing in: the admin page that sent you to the login
 * (requireUser adds it as ?next=), or the dashboard. Only admin pages on this
 * site qualify. Anything else would turn the login into an open redirect
 * (/admin/login?next=https://evil.example), and the login and logout pages
 * themselves would go nowhere useful.
 */
export function afterLogin(next) {
  if (typeof next !== 'string' || /[\\\s]/.test(next)) return '/admin'
  if (!/^\/admin(?:[/?#]|$)/.test(next)) return '/admin'
  if (/^\/admin\/log(?:in|out)(?:[/?#]|$)/.test(next)) return '/admin'
  return next
}

/** Use at the top of every protected loader and action. */
export async function requireUser(request) {
  const user = await getUser(request)
  if (!user) {
    const url = new URL(request.url)
    throw redirect(`/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`)
  }
  return user
}

export async function logout(request) {
  const session = await sessionStorage().getSession(request.headers.get('Cookie'))
  return redirect('/admin/login', {
    headers: { 'Set-Cookie': await sessionStorage().destroySession(session) },
  })
}
