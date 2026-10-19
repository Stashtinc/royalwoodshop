import { Form, Link, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import { listPrintCatalogues, createPrintCatalogue, deletePrintCatalogue } from '../../lib/print-catalogues.server'
import SectionTabs from '../../components/admin/SectionTabs'
import { ConfirmForm } from '../../components/admin/ConfirmDialog'

export async function loader({ request }) {
  await requireUser(request)
  return { catalogues: await listPrintCatalogues() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = f.get('intent')

  if (intent === 'create') {
    const id = await createPrintCatalogue(user.email)
    await log(user, 'print_catalogue.create', { entityType: 'print_catalogue', entityId: id, entityLabel: 'Product Catalogue' })
    return null
  }

  if (intent === 'delete') {
    const id = Number(f.get('catalogueId'))
    const label = String(f.get('title') ?? 'Catalogue')
    await deletePrintCatalogue(id)
    await log(user, 'print_catalogue.delete', { entityType: 'print_catalogue', entityId: id, entityLabel: label })
    return null
  }

  return null
}

const date = (d) => new Date(d).toISOString().slice(0, 10)

export default function AdminCatalogue() {
  const { catalogues } = useLoaderData()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{catalogues.length} total</p>
          <Form method="post">
            <input type="hidden" name="intent" value="create" />
            <button type="submit" className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
              + New catalogue
            </button>
          </Form>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {catalogues.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-500">No catalogues yet. Click New catalogue to start one.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Prices</th>
                <th className="px-4 py-3">Last changed</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {catalogues.map((c) => (
                <tr key={c.id} className="relative border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800"><Link to={`/admin/catalogue/${c.id}`} className="after:absolute after:inset-0">{c.title}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{c.productCount}</td>
                  <td className="px-4 py-3 text-gray-600">{c.showPrices ? 'On' : 'Off'}</td>
                  <td className="px-4 py-3 text-gray-600">{date(c.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmForm method="post"
                      confirm={{ title: `Delete "${c.title}"?`, message: 'The catalogue is removed. Products are not affected.', action: 'Delete' }}>
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="catalogueId" value={c.id} />
                      <input type="hidden" name="title" value={c.title} />
                      <button type="submit" className="relative z-10 text-sm text-red-600 hover:text-red-800">Delete</button>
                    </ConfirmForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
