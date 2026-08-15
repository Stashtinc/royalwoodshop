import { useState } from 'react'
import { Outlet, Link, NavLink, Form, useLoaderData, useLocation } from 'react-router'
import { requireUser } from '../../lib/auth.server'

export async function loader({ request }) {
  return { user: await requireUser(request) }
}

export const meta = () => [
  { title: 'Admin | The Royal Wood Shop' },
  { name: 'robots', content: 'noindex, nofollow' },
]

/* ------------------------------------------------------------------ icons */

const icon = 'h-[18px] w-[18px] shrink-0'
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

const DashboardIcon = () => (
  <svg viewBox="0 0 20 20" className={icon} aria-hidden="true" {...stroke}>
    <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
  </svg>
)

const LogsIcon = () => (
  <svg viewBox="0 0 20 20" className={icon} aria-hidden="true" {...stroke}>
    <path d="M4.5 2.5h8l3 3v12h-11z" />
    <path d="M7 8.5h6M7 11.5h6M7 14.5h4" />
  </svg>
)

const ProductsIcon = () => (
  <svg viewBox="0 0 20 20" className={icon} aria-hidden="true" {...stroke}>
    <path d="M10 2.2 17.3 6v8L10 17.8 2.7 14V6z" />
    <path d="M2.9 6 10 9.8 17.1 6M10 9.8v8" />
  </svg>
)

const SiteIcon = () => (
  <svg viewBox="0 0 20 20" className={icon} aria-hidden="true" {...stroke}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M2.6 10h14.8M10 2.5c1.9 2 3 4.7 3 7.5s-1.1 5.5-3 7.5c-1.9-2-3-4.7-3-7.5s1.1-5.5 3-7.5z" />
  </svg>
)

const MenuIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" {...stroke}>
    <path d="M3 5.5h14M3 10h14M3 14.5h14" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" {...stroke}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
)

/* ---------------------------------------------------------------- sidebar */

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', Icon: DashboardIcon },
  { to: '/admin/products', label: 'Products', Icon: ProductsIcon },
  { to: '/admin/logs', label: 'Logs', Icon: LogsIcon },
]

function SidebarContent({ user, onNavigate }) {
  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-royal-blue text-white'
        : 'text-gray-700 hover:bg-gray-100 hover:text-tundora'
    }`

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/admin" onClick={onNavigate} className="block leading-tight">
          <span className="block font-serif text-base font-bold text-tundora">The Royal Wood Shop</span>
          <span className="font-sans text-[11px] tracking-wide text-gray-400 uppercase">Catalogue admin</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end} className={link} onClick={onNavigate}>
            <Icon />
            {label}
          </NavLink>
        ))}

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-tundora"
        >
          <SiteIcon />
          View site
          <span className="ml-auto text-[11px] text-gray-400">↗</span>
        </a>
      </nav>

      <div className="mt-auto border-t border-gray-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-gray-700">{user.name || user.email}</p>
        <p className="truncate text-xs text-gray-400">{user.email}</p>
        <Form method="post" action="/admin/logout" className="mt-3">
          <button className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50">
            Sign out
          </button>
        </Form>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user } = useLoaderData()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 bg-white lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:border-gray-400"
        >
          <MenuIcon />
        </button>
        <span className="font-serif text-sm font-bold text-tundora">Royal Wood Shop admin</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <CloseIcon />
            </button>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main key={pathname} className="px-5 py-6 lg:ml-60 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
