import { useEffect, useRef, useState } from 'react'

/**
 * Shared admin toast — top-right, dark, 10 s auto-dismiss.
 *
 * Self-dismissing: tracks its own visibility so it works even when the parent
 * can't clear the message (e.g. when driven directly from useActionData).
 * Pass onDismiss to also clear the message in the parent on close.
 */
export default function Toast({ message, onDismiss, duration = 10000 }) {
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
  }, [message, duration, onDismiss])

  if (!visible || !message) return null

  const dismiss = () => { setVisible(false); onDismiss?.() }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl"
    >
      <svg className="h-4 w-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
      <button type="button" onClick={dismiss} aria-label="Dismiss"
        className="ml-1 shrink-0 text-gray-400 hover:text-white">
        ✕
      </button>
    </div>
  )
}
