import { useEffect, useRef, useState } from 'react'
import SigPad from 'signature_pad'

export default function SignaturePad() {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const [signed, setSigned] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))

  useEffect(() => {
    const canvas = canvasRef.current
    const pad = new SigPad(canvas, {
      penColor: '#1a1a1a',
      backgroundColor: 'rgba(0,0,0,0)',
      minWidth: 1,
      maxWidth: 2.5,
    })
    padRef.current = pad

    function resize() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      canvas.getContext('2d').scale(ratio, ratio)
      pad.clear()
      setSigned(false)
    }

    resize()
    pad.addEventListener('endStroke', () => setSigned(!pad.isEmpty()))
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function clear() {
    padRef.current?.clear()
    setSigned(false)
    setAccepted(false)
  }

  function accept() {
    if (!signed || !name.trim()) return
    setAccepted(true)
  }

  if (accepted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
        <svg className="mx-auto mb-3 h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-serif text-lg font-bold text-emerald-700">Quotation Accepted</p>
        <p className="mt-1 font-sans text-sm text-emerald-600">
          Signed by <strong>{name}</strong>{position ? `, ${position}` : ''} on {date}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Name + Position + Date */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Name', value: name, onChange: setName, placeholder: 'Full name', required: true },
          { label: 'Position', value: position, onChange: setPosition, placeholder: 'Title or role' },
          { label: 'Date', value: date, onChange: setDate, placeholder: '' },
        ].map(({ label, value, onChange, placeholder, required }) => (
          <div key={label}>
            <label className="mb-1 block font-sans text-xs font-semibold uppercase tracking-widest text-gray-400">
              {label}{required && <span className="ml-0.5 text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-sans text-sm text-gray-800 outline-none focus:border-royal-blue"
            />
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="font-sans text-xs font-semibold uppercase tracking-widest text-gray-400">
            Signature<span className="ml-0.5 text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={clear}
            className="font-sans text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            Clear
          </button>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
          <canvas
            ref={canvasRef}
            className="h-36 w-full touch-none"
            style={{ cursor: 'crosshair' }}
          />
          {!signed && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-gray-300">
              Sign here
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={accept}
        disabled={!signed || !name.trim()}
        className="w-fit rounded-lg bg-royal-blue px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-royal-blue-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Accept & Sign
      </button>
    </div>
  )
}
