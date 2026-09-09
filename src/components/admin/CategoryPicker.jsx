import { useState } from 'react'

/**
 * Hierarchical category picker for the admin product forms.
 *
 * Shows top-level categories with their sub-categories underneath. Checking a
 * sub auto-checks its parent. Unchecking a parent also unchecks all its subs.
 * One checked top-level category is marked Primary — that is the canonical
 * address (/products/<primary>/<slug>/). Additional checked categories are
 * browse paths only.
 *
 * Renders hidden inputs so the enclosing form can submit the selection:
 *   primaryCategoryId  — the primary top-level category ID
 *   categoryId[]       — every checked category ID (top-level and sub)
 */
export default function CategoryPicker({ tree, initialLinkedIds = [], initialPrimaryId = null }) {
  const [checked, setChecked] = useState(() => new Set(initialLinkedIds.map(String)))
  const [primaryId, setPrimaryId] = useState(() => String(initialPrimaryId ?? ''))

  function toggleTop(top) {
    const sid = String(top.id)
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) {
        next.delete(sid)
        for (const sub of top.subcategories) next.delete(String(sub.id))
        if (primaryId === sid) {
          const firstOther = tree.find((t) => t.id !== top.id && next.has(String(t.id)))
          setPrimaryId(firstOther ? String(firstOther.id) : '')
        }
      } else {
        next.add(sid)
        if (!primaryId) setPrimaryId(sid)
      }
      return next
    })
  }

  function toggleSub(sub, parentId) {
    const ssid = String(sub.id)
    const spid = String(parentId)
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(ssid)) {
        next.delete(ssid)
      } else {
        next.add(ssid)
        if (!next.has(spid)) {
          next.add(spid)
          if (!primaryId) setPrimaryId(spid)
        }
      }
      return next
    })
  }

  const checkedTops = tree.filter((t) => checked.has(String(t.id)))

  return (
    <>
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="primaryCategoryId" value={primaryId} />
      {[...checked].map((id) => (
        <input key={id} type="hidden" name="categoryId" value={id} />
      ))}

      <div className="flex flex-col divide-y divide-gray-100">
        {tree.map((top) => {
          const topChecked = checked.has(String(top.id))
          const isPrimary = primaryId === String(top.id)
          return (
            <div key={top.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`cat-top-${top.id}`}
                  checked={topChecked}
                  onChange={() => toggleTop(top)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-royal-blue"
                />
                <label
                  htmlFor={`cat-top-${top.id}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-gray-800"
                >
                  {top.name}
                </label>
                {topChecked && (
                  checkedTops.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setPrimaryId(String(top.id))}
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        isPrimary
                          ? 'bg-royal-blue text-white'
                          : 'border border-gray-300 text-gray-500 hover:border-royal-blue hover:text-royal-blue'
                      }`}
                    >
                      {isPrimary ? '★ Primary' : 'Set primary'}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded bg-royal-blue px-2 py-0.5 text-[10px] font-medium text-white">
                      ★ Primary
                    </span>
                  )
                )}
              </div>

              {top.subcategories.length > 0 && (
                <div className="ml-7 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {top.subcategories.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(String(sub.id))}
                        onChange={() => toggleSub(sub, top.id)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-royal-blue"
                      />
                      {sub.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {checked.size === 0 && (
        <p className="text-xs text-amber-700">No category selected — the product won't appear in any browse listing.</p>
      )}
    </>
  )
}
