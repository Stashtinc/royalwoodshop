import { useCallback, useEffect, useRef, useState } from 'react'
import { Form, useSubmit } from 'react-router'

/**
 * The admin's own confirm box (same look as "Unsaved changes"), in place of
 * the browser's confirm(). Usage:
 *
 *   const [confirm, confirmDialog] = useConfirm()
 *   if (await confirm({ title, message, action: 'Delete' })) …
 *   …and render {confirmDialog} once in the page.
 */
export function useConfirm() {
  const [ask, setAsk] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setAsk(opts)
  }), [])

  const close = (answer) => { resolver.current?.(answer); resolver.current = null; setAsk(null) }

  const dialog = ask ? <ConfirmDialog {...ask} onCancel={() => close(false)} onConfirm={() => close(true)} /> : null
  return [confirm, dialog]
}

function ConfirmDialog({ title = 'Are you sure?', message, action = 'Confirm', cancel = 'Cancel', danger = true, onCancel, onConfirm }) {
  const confirmRef = useRef(null)
  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="font-serif text-lg font-bold text-tundora">{title}</h2>
        {message && <p className="mt-2 font-sans text-sm text-gray-600">{message}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">
            {cancel}
          </button>
          <button type="button" ref={confirmRef} onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-royal-blue hover:bg-royal-blue-dark'}`}>
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A Form that asks first, in the admin's confirm box: submits only when
 * confirmed. `confirm` = { title, message, action }; `onConfirmed` runs just
 * before submitting.
 */
export function ConfirmForm({ confirm: ask, onConfirmed, children, ...formProps }) {
  const [confirm, dialog] = useConfirm()
  const submit = useSubmit()
  return (
    <>
      <Form {...formProps} onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        if (await confirm(ask)) { onConfirmed?.(); submit(form) }
      }}>
        {children}
      </Form>
      {dialog}
    </>
  )
}
