import { useMemo } from 'react'
import { Form, Link, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { log } from '../../lib/activity.server'
import {
  getPrintCatalogue, updatePrintCatalogue, addProductToCatalogue,
  removeItemFromCatalogue, searchProductsForCatalogue, reorderCatalogueItems,
} from '../../lib/print-catalogues.server'
import SectionTabs from '../../components/admin/SectionTabs'
import { useDragReorder } from '../../components/admin/useDragReorder'

export async function loader({ request, params }) {
  await requireUser(request)
  const catalogue = await getPrintCatalogue(params.id)
  if (!catalogue) throw new Response('Not found', { status: 404 })
  const q = new URL(request.url).searchParams.get('q') ?? ''
  const results = q.trim() ? await searchProductsForCatalogue(q) : []
  return { catalogue, q, results }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const intent = f.get('intent')
  const id = Number(params.id)

  if (intent === 'save') {
    const title = String(f.get('title') ?? '')
    const showPrices = f.get('showPrices') === 'on'
    await updatePrintCatalogue(id, { title, showPrices })
    await log(user, 'print_catalogue.update', { entityType: 'print_catalogue', entityId: id, entityLabel: title.trim() || 'Product Catalogue' })
  }

  if (intent === 'add') {
    const productId = Number(f.get('productId'))
    await addProductToCatalogue(id, productId)
    await log(user, 'print_catalogue.add_product', { entityType: 'print_catalogue', entityId: id, details: { productId } })
  }

  if (intent === 'reorder') {
    await reorderCatalogueItems(id, String(f.get('ids') ?? '').split(','))
  }

  if (intent === 'remove') {
    const itemId = Number(f.get('itemId'))
    await removeItemFromCatalogue(id, itemId)
    await log(user, 'print_catalogue.remove_product', { entityType: 'print_catalogue', entityId: id, details: { itemId } })
  }

  return null
}

const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'
const card = 'rounded-xl border border-gray-200 bg-white p-6'

export default function CatalogueBuilder() {
  const { catalogue, q, results } = useLoaderData()
  const inCatalogue = new Set(catalogue.items.map((i) => i.productId))
  // The drag hook needs an id on each row; the catalogue item id serves.
  const rows = useMemo(() => catalogue.items.map((i) => ({ ...i, id: i.itemId })), [catalogue.items])
  const { order, itemProps } = useDragReorder(rows)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs active="catalogue" />
        <Link to="/admin/catalogue" className="text-sm text-gray-500 hover:text-gray-800">← All catalogues</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_3fr]">
        <section className={card}>
          <h2 className="font-serif text-lg font-bold text-tundora">Catalogue</h2>
          <Form method="post" className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="intent" value="save" />
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Title
              <input name="title" defaultValue={catalogue.title} className={input} />
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" name="showPrices" defaultChecked={catalogue.showPrices} className="h-4 w-4 accent-royal-blue" />
              Show prices
            </label>
            <div>
              <button type="submit" className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">Save</button>
            </div>
          </Form>
        </section>

        <section className={card}>
          <h2 className="font-serif text-lg font-bold text-tundora">Add products</h2>
          <Form method="get" className="mt-4 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Name, product code or Part ID" className={`${input} flex-1`} />
            <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">Search</button>
          </Form>
          {q.trim() && (
            <ul className="mt-4 divide-y divide-gray-100">
              {results.length === 0 && <li className="py-3 text-sm text-gray-500">No products match.</li>}
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-gray-800">{p.name} <span className="font-mono text-xs text-gray-500">{p.productCode}</span></span>
                  {inCatalogue.has(p.id) ? (
                    <span className="text-xs text-gray-400">Added</span>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="intent" value="add" />
                      <input type="hidden" name="productId" value={p.id} />
                      <button type="submit" className="text-sm font-medium text-royal-blue hover:underline">Add</button>
                    </Form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="font-serif text-lg font-bold text-tundora">Products in this catalogue ({catalogue.items.length})</h2>
        {catalogue.items.length > 1 && <p className="mt-1 text-xs text-gray-500">Drag a row to change the print order.</p>}
        {catalogue.items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No products yet. Search above to add some.</p>
        ) : (
          <ol className="mt-4 divide-y divide-gray-100">
            {order.map((item, i) => (
              <li key={item.itemId} {...itemProps(item)} className="flex cursor-grab items-center justify-between gap-3 py-3 data-[dragging=true]:opacity-50">
                <span className="text-sm text-gray-800">
                  <span className="mr-3 text-gray-400">{i + 1}.</span>
                  {item.name} <span className="font-mono text-xs text-gray-500">{item.productCode}</span>
                  {item.status === 'archived' && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Archived: not printed</span>
                  )}
                </span>
                <Form method="post">
                  <input type="hidden" name="intent" value="remove" />
                  <input type="hidden" name="itemId" value={item.itemId} />
                  <button type="submit" className="text-sm text-red-600 hover:text-red-800">Remove</button>
                </Form>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
