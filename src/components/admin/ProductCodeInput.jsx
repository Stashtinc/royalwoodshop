import { useEffect, useRef, useState } from 'react'

/**
 * Product code field that checks as you type. A code another product already
 * uses turns the field red, says which product, and blocks saving (the
 * browser refuses to submit an invalid field). The server checks again on save.
 */
export default function ProductCodeInput({ defaultValue = '', exceptId = null, className = '', placeholder }) {
  const ref = useRef(null)
  const [taken, setTaken] = useState(null)
  const [value, setValue] = useState(defaultValue ?? '')
  const original = useRef(String(defaultValue ?? '').trim().toUpperCase())

  useEffect(() => {
    const code = value.trim()
    // A product keeps its own code even if it already shares it; only a change is checked.
    if (!code || code.toUpperCase() === original.current && exceptId) { setTaken(null); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ code, ...(exceptId ? { except: String(exceptId) } : {}) })
        const r = await fetch(`/admin/product-code?${qs}`, { signal: ctrl.signal })
        if (r.ok) setTaken((await r.json()).taken)
      } catch { /* typing on; the server checks on save anyway */ }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [value, exceptId])

  const message = taken
    ? `${value.trim()} is already used by "${taken.name}"${taken.status === 'archived' ? ' (archived)' : ''}. Each product needs its own code, e.g. ${value.trim()}-MDF.`
    : ''
  useEffect(() => { ref.current?.setCustomValidity(message) }, [message])

  return (
    <>
      <input
        ref={ref}
        name="productCode"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-invalid={taken ? 'true' : undefined}
        className={`${className} ${taken ? 'border-red-500 bg-red-50 focus:border-red-600' : ''}`}
      />
      {taken && <span role="alert" className="text-xs font-medium text-red-700">{message}</span>}
    </>
  )
}
