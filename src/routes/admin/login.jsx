import { Form, useActionData } from 'react-router'
import { login, createSession, getUser, afterLogin } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { clientIp } from '../../lib/rate-limit.server'

/** The page to return to, from ?next= — see afterLogin. */
const nextOf = (request) => afterLogin(new URL(request.url).searchParams.get('next'))

export async function loader({ request }) {
  const user = await getUser(request)
  if (user) throw new Response(null, { status: 302, headers: { Location: nextOf(request) } })
  return null
}

export async function action({ request }) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '')
  const password = String(form.get('password') ?? '')
  if (!email || !password) return { error: 'Enter your email and password.' }
  const ip = clientIp(request)
  const { user, retryAfter } = await login(email, password, { ip })
  if (retryAfter) {
    const minutes = Math.ceil(retryAfter / 60)
    return { error: `Too many sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` }
  }
  if (!user) {
    // Recorded so that someone guessing passwords shows up in the log.
    const address = email.trim().toLowerCase().slice(0, 254)
    await log({ email: address }, 'auth.login_failed', { entityType: 'user', entityLabel: address, details: { ip } })
    return { error: 'Those details were not recognised.' }
  }
  await log(user, 'auth.login', { entityType: 'user', entityId: user.id, entityLabel: user.name || user.email })
  return createSession(user.id, nextOf(request))
}

export const meta = () => [
  { title: 'Sign in | Royal Wood Shop admin' },
  { name: 'robots', content: 'noindex, nofollow' },
]

export default function Login() {
  const data = useActionData()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <Form method="post" className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-center gap-3 pb-2">
            <img src="/logo.svg" alt="Royal Wood Shop" className="h-24" />
            <h1 className="font-serif text-2xl font-bold text-tundora">Sign in</h1>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input name="email" type="email" autoComplete="username" required
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-royal-blue" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input name="password" type="password" autoComplete="current-password" required
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-royal-blue" />
          </label>
          {data?.error && <p className="text-sm text-red-700">{data.error}</p>}
          <button className="rounded-lg bg-royal-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark">
            Sign in
          </button>
        </Form>
      </div>
    </div>
  )
}
