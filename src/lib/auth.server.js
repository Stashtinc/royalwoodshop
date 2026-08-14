import { createCookieSessionStorage, redirect } from 'react-router'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { getDb } from './db.server.js'
import { users } from '../db/schema.js'

const secret = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me'
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('SESSION_SECRET is not set — sessions are not secure in production')
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'rws_admin',
    httpOnly: true,          // not readable by JavaScript
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 14,
    secrets: [secret],
  },
})

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
  const session = await storage.getSession()
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await storage.commitSession(session) },
  })
}

export async function getUser(request) {
  const session = await storage.getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId) return null
  const db = await getDb()
  const [user] = await db.select({
    id: users.id, email: users.email, name: users.name, role: users.role,
  }).from(users).where(eq(users.id, userId)).limit(1)
  return user ?? null
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
  const session = await storage.getSession(request.headers.get('Cookie'))
  return redirect('/admin/login', {
    headers: { 'Set-Cookie': await storage.destroySession(session) },
  })
}
