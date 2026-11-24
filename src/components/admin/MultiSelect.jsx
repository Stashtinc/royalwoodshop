import { useEffect, useRef, useState } from 'react'

/**
 * A dropdown with a tick box per option, so several can be chosen at once.
 * `selected` is an array of option values. Closes when you click outside it.
 */
export default function MultiSelect({ label, options, selected, onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = (value) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  const text = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? (options.find((o) => o.value === selected[0])?.label ?? label)
      : `${label} (${selected.length})`

  return (
    // Reset the heading style it sits under (uppercase, bold, spaced), so the options read as plain text.
    <div ref={ref} className="relative normal-case font-normal tracking-normal text-sm text-gray-700">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-left text-sm ${selected.length ? 'border-royal-blue text-royal-blue' : 'border-gray-300 text-gray-700'} bg-white`}>
        <span className="truncate">{text}</span>
        <span aria-hidden="true" className="text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 min-w-full w-max max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mb-1 w-full rounded px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50">Clear</button>
          )}
          {options.length === 0 && <p className="px-2 py-1.5 text-xs text-gray-500">Nothing to choose.</p>}
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 accent-royal-blue" />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
