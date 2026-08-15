import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

/**
 * The AI Assist dialog for the article editor.
 *
 * Two things it can do: draft an article body, or write the summary and search
 * listing for one that already exists. Both end in a preview with Use / Discard
 * — nothing is written into the editor until someone approves it, because an
 * assistant that overwrites work in progress stops being used within a week.
 *
 * It talks to the editor's own route action via a fetcher, so the surrounding
 * <Form> is never submitted by accident.
 */

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">
        {label} {hint && <span className="font-normal text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'

const LENGTHS = [
  ['short', 'Short', '~400 words'],
  ['medium', 'Medium', '~800 words'],
  ['long', 'Long', '~1,400 words'],
]

export default function AiAssist({ open, onClose, onUseArticle, onUseMetadata, getEditorState }) {
  const fetcher = useFetcher()
  const [mode, setMode] = useState('article')
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [length, setLength] = useState('medium')
  const dialogRef = useRef(null)
  const firstField = useRef(null)

  const busy = fetcher.state !== 'idle'
  const result = fetcher.data?.ai
  const error = fetcher.data?.aiError

  // Escape closes, and focus lands somewhere useful on open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    firstField.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const run = () => {
    const state = getEditorState()
    fetcher.submit(
      mode === 'article'
        ? { intent: 'ai-article', topic, notes, length }
        : { intent: 'ai-metadata', title: state.title, contentHtml: state.contentHtml },
      { method: 'post', encType: 'application/x-www-form-urlencoded' },
    )
  }

  const accept = () => {
    if (result?.kind === 'article') onUseArticle(result)
    if (result?.kind === 'metadata') onUseMetadata(result)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="AI Assist"
        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">

        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-tundora">AI Assist</h2>
            <p className="text-xs text-gray-500">Everything is a suggestion — nothing changes until you accept it.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40">
            ×
          </button>
        </div>

        {/* mode switch */}
        <div className="flex gap-1 border-b border-gray-200 px-5 pt-3">
          {[
            ['article', 'Write an article'],
            ['metadata', 'Summary & search listing'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMode(key)} disabled={busy}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                mode === key
                  ? 'border-royal-blue text-royal-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}

          {/* ---------------------------------------------------------- input */}
          {!result && mode === 'article' && (
            <>
              <Field label="What is the article about?">
                <input ref={firstField} value={topic} onChange={(e) => setTopic(e.target.value)}
                  disabled={busy} className={input}
                  placeholder="Choosing baseboard height for a 1960s bungalow" />
              </Field>

              <Field label="Anything it must cover?" hint="optional — one point per line">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  disabled={busy} className={input}
                  placeholder={'Mention MDF vs finger-joint pine\nCover how it meets existing door casing\nSuggest visiting the showroom to see profiles'} />
              </Field>

              <Field label="Length">
                <div className="flex gap-2">
                  {LENGTHS.map(([key, label, words]) => (
                    <button key={key} type="button" onClick={() => setLength(key)} disabled={busy}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                        length === key
                          ? 'border-royal-blue bg-blue-50 text-royal-blue'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {label} <span className="block text-xs text-gray-400">{words}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {!result && mode === 'metadata' && (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              This reads the article you have written and proposes the summary, the
              search-listing title and the meta description. Nothing is sent until you
              press Generate, and nothing is applied until you accept it.
            </p>
          )}

          {/* --------------------------------------------------------- result */}
          {result?.kind === 'article' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-lg font-bold text-tundora">{result.title}</p>
                <span className="shrink-0 text-xs text-gray-400">{result.words} words</span>
              </div>
              <div className="prose-royal max-h-[45vh] max-w-none overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                dangerouslySetInnerHTML={{ __html: result.html }} />
              <p className="text-xs text-gray-500">
                Accepting replaces the article body. Read it first — it can be confidently
                wrong about specifics, and anything about products, prices or lead times
                needs checking against the catalogue.
              </p>
            </div>
          )}

          {result?.kind === 'metadata' && (
            <div className="flex flex-col gap-3">
              {[
                ['Summary', result.excerpt, null],
                ['Search listing title', result.seoTitle, 60],
                ['Meta description', result.seoDescription, 155],
              ].map(([label, value, limit]) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
                    {limit && (
                      <span className={`text-xs ${value.length > limit ? 'text-red-500' : 'text-gray-400'}`}>
                        {value.length}/{limit}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-800">{value || <em className="text-gray-400">empty</em>}</p>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Accepting overwrites the summary and both search-listing fields.
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          {result ? (
            <>
              <button type="button" onClick={() => fetcher.load(window.location.pathname)}
                className="mr-auto text-sm text-gray-500 hover:underline">
                Start over
              </button>
              <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:underline">
                Discard
              </button>
              <button type="button" onClick={accept}
                className="rounded-lg bg-royal-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark">
                {result.kind === 'article' ? 'Use this article' : 'Use these'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={busy}
                className="text-sm text-gray-600 hover:underline disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={run}
                disabled={busy || (mode === 'article' && !topic.trim())}
                className="flex items-center gap-2 rounded-lg bg-royal-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">
                {busy && <Spinner />}
                {busy ? 'Writing…' : 'Generate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
