import { useEffect, useRef, useState } from 'react'

/**
 * Shared admin toast — top-right, fixed, so it is seen wherever the page is
 * scrolled. Success: dark, 10 s auto-dismiss. Error (tone="error"): red, stays
 * until closed. `stamp` re-shows the same message when it comes back again.
 *
 * Self-dismissing: tracks its own visibility so it works even when the parent
 * can't clear the message (e.g. when driven directly from useActionData).
 * Pass onDismiss to also clear the message in the parent on close.
 */
export default function Toast({ message, onDismiss, tone = 'success', stamp, top = 'top-5', duration = tone === 'error' ? 0 : 10000 }) {
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!message) { setVisible(false); return }
    setVisible(true)
    clearTimeout(timer.current)
    if (!duration) return
    timer.current = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer.current)
  }, [message, stamp, duration, onDismiss])

  if (!visible || !message) return null

  const dismiss = () => { setVisible(false); onDismiss?.() }

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`fixed ${top} right-5 z-50 flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-xl ${
        tone === 'error' ? 'border border-red-300 bg-red-50 text-red-900' : 'bg-gray-900 text-white'
      }`}
    >
      {tone === 'error' ? (
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      ) : (
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className="flex-1">{message}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss"
        className={`ml-1 shrink-0 ${tone === 'error' ? 'text-red-400 hover:text-red-700' : 'text-gray-400 hover:text-white'}`}>
        ✕
      </button>
    </div>
  )
}
