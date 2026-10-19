import { Form } from 'react-router'

const select = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'

/** Asks which print catalogue to add products to, then posts intent add-to-catalogue. */
export default function AddToCatalogueDialog({ productIds, catalogues, onClose }) {
  const count = productIds.length
  const defaultId = catalogues[0] ? String(catalogues[0].id) : 'new'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add to catalogue"
        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-lg font-bold text-tundora">
          Add {count} product{count === 1 ? '' : 's'} to a catalogue
        </h2>
        <Form method="post" onSubmit={onClose} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="intent" value="add-to-catalogue" />
          <input type="hidden" name="productIds" value={productIds.join(',')} />
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Catalogue
            <select name="catalogueId" defaultValue={defaultId} className={select}>
              {catalogues.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
              <option value="new">+ New catalogue</option>
            </select>
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
              Add
            </button>
          </div>
        </Form>
      </div>
    </div>
  )
}
