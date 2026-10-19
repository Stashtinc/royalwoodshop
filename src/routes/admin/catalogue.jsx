import { Link } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import SectionTabs from '../../components/admin/SectionTabs'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

export default function AdminCatalogue() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
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
