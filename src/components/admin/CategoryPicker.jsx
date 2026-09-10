import { useState } from 'react'

export default function CategoryPicker({ tree, initialLinkedIds = [], initialPrimaryId = null }) {
  const initIds = initialLinkedIds.map(String)

  const [checked, setChecked] = useState(() => new Set(initIds))
  const [primaryId, setPrimaryId] = useState(() => String(initialPrimaryId ?? ''))
  const [expanded, setExpanded] = useState(() => {
    // Auto-expand any top-level that has a checked item (top or sub)
    const exp = new Set()
    for (const top of tree) {
      if (initIds.includes(String(top.id))) exp.add(String(top.id))
      for (const sub of top.subcategories) {
        if (initIds.includes(String(sub.id))) exp.add(String(top.id))
      }
    }
    return exp
  })

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
        setExpanded((e) => { const n = new Set(e); n.delete(sid); return n })
      } else {
        next.add(sid)
        // Also select all subcategories and expand
        for (const sub of top.subcategories) next.add(String(sub.id))
        if (!primaryId) setPrimaryId(sid)
        setExpanded((e) => new Set([...e, sid]))
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

  function toggleExpand(topId) {
    const sid = String(topId)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })
  }

  const checkedTops = tree.filter((t) => checked.has(String(t.id)))

  return (
    <>
      <input type="hidden" name="primaryCategoryId" value={primaryId} />
      {[...checked].map((id) => (
        <input key={id} type="hidden" name="categoryId" value={id} />
      ))}

      <div className="flex flex-col divide-y divide-gray-100">
        {tree.map((top) => {
          const topChecked = checked.has(String(top.id))
          const isPrimary = primaryId === String(top.id)
          const isExpanded = expanded.has(String(top.id))
          const hasSubs = top.subcategories.length > 0

          return (
            <div key={top.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`cat-top-${top.id}`}
                  checked={topChecked}
                  onChange={() => toggleTop(top)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-royal-blue"
                />
                <label
                  htmlFor={`cat-top-${top.id}`}
                  className="flex-1 cursor-pointer select-none text-sm font-medium text-gray-800"
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

                {hasSubs && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(top.id)}
                    className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={isExpanded ? 'Collapse sub-categories' : 'Expand sub-categories'}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {hasSubs && isExpanded && (
                <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
                  {top.subcategories.map((sub) => {
                    const subChecked = checked.has(String(sub.id))
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSub(sub, top.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          subChecked
                            ? 'bg-royal-blue text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {sub.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {checked.size === 0 && (
        <p className="mt-1 text-xs text-amber-700">
          No category selected — the product won't appear in any browse listing.
        </p>
      )}
    </>
  )
}
