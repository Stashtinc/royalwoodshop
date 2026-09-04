import { Form, useActionData, useSearchParams } from 'react-router'
import { login, createSession, getUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'

export async function loader({ request }) {
  const user = await getUser(request)
  if (user) throw new Response(null, { status: 302, headers: { Location: '/admin' } })
  return null
}

export async function action({ request }) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '')
  const password = String(form.get('password') ?? '')
  const next = String(form.get('next') || '/admin')

  if (!email || !password) return { error: 'Enter your email and password.' }
  const user = await login(email, password)
  if (!user) return { error: 'Those details were not recognised.' }
  await log(user, 'auth.login', { entityType: 'user', entityId: user.id, entityLabel: user.name || user.email })
  return createSession(user.id, next.startsWith('/admin') ? next : '/admin')
}

export const meta = () => [
  { title: 'Sign in | Royal Wood Shop admin' },
  { name: 'robots', content: 'noindex, nofollow' },
]

export default function Login() {
  const data = useActionData()
  const [params] = useSearchParams()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <img src="/logo.svg" alt="Royal Wood Shop" className="mb-6 h-14" />
        <h1 className="mb-6 font-serif text-2xl font-bold text-tundora">Sign in</h1>
        <Form method="post" className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6">
          <input type="hidden" name="next" value={params.get('next') ?? '/admin'} />
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
