import { useEffect, useState } from 'react'

/**
 * A confirmation that stays put.
 *
 * Fixed to the bottom of the viewport rather than placed in the flow, because
 * the message a save produces is most needed at the moment the page has just
 * navigated and the eye is somewhere unpredictable. An inline banner at the top
 * of a long list is invisible to anyone who was scrolled down.
 *
 * Dismissed by hand or after `duration`. Set duration to 0 for messages that
 * should not disappear on their own.
 */
export default function Toast({ message, tone = 'success', duration = 6000, onDismiss }) {
  const [visible, setVisible] = useState(Boolean(message))

  useEffect(() => {
    setVisible(Boolean(message))
    if (!message || !duration) return
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  if (!message || !visible) return null

  const tones = {
    success: 'border-green-300 bg-green-50 text-green-900',
    info: 'border-blue-300 bg-blue-50 text-blue-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
  }

  const close = () => { setVisible(false); onDismiss?.() }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6">
      <div role="status" aria-live="polite"
        className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${tones[tone] ?? tones.success}`}>
        {tone === 'success' && (
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="text-sm font-medium">{message}</p>
        <button type="button" onClick={close} aria-label="Dismiss"
          className="-mr-1 ml-2 rounded px-1.5 text-lg leading-none opacity-50 transition-opacity hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  )
}
