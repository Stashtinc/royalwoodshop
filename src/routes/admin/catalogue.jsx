import { requireUser } from '../../lib/auth.server'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

export default function AdminCatalogue() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="font-serif text-2xl text-gray-500">Coming soon</p>
    </div>
  )
}
