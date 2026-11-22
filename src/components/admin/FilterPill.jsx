import { useCallback, useEffect, useRef, useState } from 'react'

/** Dropdown pill used for filters on the admin lists. */
export default function FilterPill({ label, value, options, onChange, activeClass }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isActive = !!value

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) close() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])

  const activeStyle = activeClass ?? 'border-royal-blue bg-royal-blue text-white'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none ${
          isActive ? activeStyle : 'border-gray-300 text-gray-600 hover:border-royal-blue'
        }`}
      >
        {value ? options.find((o) => o.value === value)?.label ?? label : label}
        <svg
          width="10" height="10" viewBox="0 0 10 6" fill="none"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1.5 max-h-80 min-w-[11rem] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); close() }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                value === opt.value ? 'font-semibold text-royal-blue' : 'text-gray-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${value === opt.value ? 'bg-royal-blue' : 'bg-transparent'}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

