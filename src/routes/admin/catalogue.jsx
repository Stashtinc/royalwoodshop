import { Link } from 'react-router'
import { requireUser } from '../../lib/auth.server'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

export default function AdminCatalogue() {
  return (
    <div>
      <div className="flex items-center justify-end gap-3">
        <span
          aria-current="page"
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
            <path d="M4 19a2 2 0 0 1 2-2h13" />
          </svg>
          Catalogue
        </span>
        <Link
          to="/admin/products"
          className="rounded-lg border border-red-600 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Cancel
        </Link>
      </div>
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-serif text-2xl text-gray-500">Coming soon</p>
      </div>
    </div>
  )
}
