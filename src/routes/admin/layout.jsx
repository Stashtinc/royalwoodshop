import { Outlet, Link, NavLink, Form, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'

export async function loader({ request }) {
  const user = await requireUser(request)
  return { user }
}

export const meta = () => [
  { title: 'Admin | The Royal Wood Shop' },
  { name: 'robots', content: 'noindex, nofollow' },
]

const link = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-royal-blue text-white' : 'text-gray-700 hover:bg-gray-100'}`

export default function AdminLayout() {
  const { user } = useLoaderData()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link to="/admin" className="font-serif text-lg font-bold text-tundora">
            Royal Wood Shop <span className="font-sans text-xs font-normal text-gray-500">admin</span>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/admin" end className={link}>Dashboard</NavLink>
            <NavLink to="/admin/products" className={link}>Products</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name || user.email}</span>
            <Form method="post" action="/admin/logout">
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-400">
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8"><Outlet /></main>
    </div>
  )
}
