import { requireUser } from '../../lib/auth.server'
import SectionTabs from '../../components/admin/SectionTabs'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

export default function CatalogueAdmin() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTabs active="catalogue" />
      <h1 className="font-serif text-2xl font-bold text-tundora">Catalogue</h1>
    </div>
  )
}
