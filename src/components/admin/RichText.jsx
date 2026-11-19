import { useEffect, useRef, useState } from 'react'

/**
 * A small rich text editor built on contenteditable.
 *
 * Deliberately limited: headings, bold, italic, lists, links, quotes. A
 * toolbar that offers fonts and colours produces documents that fight the
 * site's typography — the constraint is the feature.
 *
 * The HTML is mirrored into a hidden input so the surrounding form submits
 * normally, with no JavaScript wiring on the save path.
 */
const BLOCKS = [
  ['p', 'Body'],
  ['h2', 'Heading'],
  ['h3', 'Subheading'],
  ['blockquote', 'Quote'],
]

function Btn({ onClick, title, active, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}   // keep the selection
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm transition-colors ${
        active ? 'bg-royal-blue text-white' : 'text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichText({ name = 'contentHtml', defaultValue = '', onDirty, apiRef }) {
  const editor = useRef(null)
  const hidden = useRef(null)
  const [block, setBlock] = useState('p')
  // HTML mode: a plain source box, so markup pasted from elsewhere is kept as written.
  const [htmlMode, setHtmlMode] = useState(false)
  const [sourceText, setSourceText] = useState('')
  // Image picker: null, 'menu' (upload or choose) or 'library' (choose from media).
  const [picker, setPicker] = useState(null)
  const [library, setLibrary] = useState([])
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const savedRange = useRef(null)

  useEffect(() => {
    if (editor.current && !editor.current.innerHTML) {
      editor.current.innerHTML = defaultValue || '<p></p>'
    }
    if (hidden.current && editor.current) hidden.current.value = editor.current.innerHTML
  }, [defaultValue])

  const sync = () => {
    if (hidden.current && editor.current) hidden.current.value = editor.current.innerHTML
    onDirty?.()
  }

  /**
   * A handle for callers that need to read or replace the content — the AI
   * Assist dialog. The editor stays uncontrolled: making it a controlled React
   * component would re-render on every keystroke and move the caret.
   */
  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      getHtml: () => (htmlMode ? sourceText : editor.current?.innerHTML) ?? '',
      setHtml: (html) => {
        if (!editor.current) return
        editor.current.innerHTML = html || '<p></p>'
        setSourceText(html || '')
        sync()
      },
    }
    return () => { apiRef.current = null }
  })

  // Switching modes moves the content across: the rich text becomes source, and the source becomes rich text.
  const toggleHtml = () => {
    if (!htmlMode) {
      setSourceText(editor.current?.innerHTML ?? '')
      setHtmlMode(true)
    } else {
      if (editor.current) editor.current.innerHTML = sourceText || '<p></p>'
      setHtmlMode(false)
      sync()
    }
  }

  const onSourceChange = (e) => {
    setSourceText(e.target.value)
    if (hidden.current) hidden.current.value = e.target.value
    onDirty?.()
  }

  const exec = (command, value = null) => {
    document.execCommand(command, false, value)
    editor.current?.focus()
    sync()
    readBlock()
  }

  const readBlock = () => {
    const current = document.queryCommandValue('formatBlock')?.toLowerCase()
    setBlock(BLOCKS.some(([tag]) => tag === current) ? current : 'p')
  }

  const addLink = () => {
    const url = window.prompt('Link address', 'https://')
    if (!url) return
    exec('createLink', url)
  }

  // Remember where the cursor was, because the picker takes focus away from the editor.
  const openPicker = () => {
    const sel = window.getSelection()
    savedRange.current = sel && sel.rangeCount && editor.current?.contains(sel.anchorNode)
      ? sel.getRangeAt(0).cloneRange()
      : null
    setImageError('')
    setPicker('menu')
  }

  const insertImage = (url) => {
    editor.current?.focus()
    if (savedRange.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
    document.execCommand('insertHTML', false, `<p><img src="${url}" alt=""></p>`)
    setPicker(null)
    sync()
  }

  const openLibrary = async () => {
    setPicker('library')
    setImageError('')
    try {
      const res = await fetch('/admin/editor-images', { credentials: 'same-origin' })
      const data = await res.json()
      setLibrary(data.images ?? [])
    } catch {
      setImageError('The media library could not be loaded. Try again.')
    }
  }

  const uploadImage = async (file) => {
    if (!file) return
    setImageBusy(true)
    setImageError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/admin/editor-images', { method: 'POST', body, credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'The image could not be uploaded.')
      insertImage(data.url)
    } catch (e) {
      setImageError(e.message)
    } finally {
      setImageBusy(false)
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[26rem] flex-col overflow-hidden rounded-lg border border-gray-300 focus-within:border-royal-blue">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <div className={`flex flex-wrap items-center gap-1 ${htmlMode ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={htmlMode}>
        <select
          value={block}
          onChange={(e) => exec('formatBlock', e.target.value)}
          className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none"
        >
          {BLOCKS.map(([tag, label]) => <option key={tag} value={tag}>{label}</option>)}
        </select>

        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Bold" onClick={() => exec('bold')}><b>B</b></Btn>
        <Btn title="Italic" onClick={() => exec('italic')}><i>I</i></Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}>•</Btn>
        <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}>1.</Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Insert image" onClick={openPicker}>🖼</Btn>
        <Btn title="Add link" onClick={addLink}>🔗</Btn>
        <Btn title="Remove link" onClick={() => exec('unlink')}>⌫</Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Clear formatting" onClick={() => exec('removeFormat')}>✕</Btn>
        </div>

        <span className="mx-1 ml-auto h-5 w-px bg-gray-300" />
        <Btn title={htmlMode ? 'Back to the visual editor' : 'Edit the HTML source'} active={htmlMode} onClick={toggleHtml}>
          <span className="font-mono text-xs font-semibold">&lt;/&gt; HTML</span>
        </Btn>
      </div>

      {picker && (
        <div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 font-sans text-sm">
          {picker === 'menu' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg bg-royal-blue px-4 py-2 font-medium text-white hover:bg-royal-blue-dark">
                {imageBusy ? 'Uploading…' : 'Upload from file'}
                <input type="file" accept="image/webp,image/jpeg,image/png" className="sr-only" disabled={imageBusy}
                  onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              <button type="button" onClick={openLibrary}
                className="rounded-lg border border-royal-blue px-4 py-2 font-medium text-royal-blue hover:bg-royal-blue hover:text-white">
                Choose from media
              </button>
              <button type="button" onClick={() => setPicker(null)} className="ml-auto text-gray-500 hover:underline">Cancel</button>
            </div>
          )}
          {picker === 'library' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Choose an image</span>
                <button type="button" onClick={() => setPicker('menu')} className="text-gray-500 hover:underline">← Back</button>
              </div>
              {library.length === 0 ? (
                <p className="text-gray-500">No images in the media library yet.</p>
              ) : (
                <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                  {library.map((img) => (
                    <button key={img.name} type="button" onClick={() => insertImage(img.url)} title={img.name}
                      className="overflow-hidden rounded-md border border-gray-200 hover:border-royal-blue">
                      <img src={img.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {imageError && <p className="text-red-600">{imageError}</p>}
        </div>
      )}

      {htmlMode && (
        <textarea
          value={sourceText}
          onChange={onSourceChange}
          spellCheck={false}
          placeholder="Paste or write HTML here"
          aria-label="HTML source"
          className="min-h-0 flex-1 resize-none overflow-y-auto bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-800 outline-none"
        />
      )}

      <div
        ref={editor}
        hidden={htmlMode}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onKeyUp={readBlock}
        onMouseUp={readBlock}
        // Paste as plain text, so pasting from Word does not import its markup.
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          sync()
        }}
        className="prose-royal min-h-0 flex-1 overflow-y-auto max-w-none bg-white px-4 py-3 outline-none"
      />

      {/* No defaultValue: React would reset this field on re-render, wiping the content sent on save. sync() keeps it current. */}
      <input ref={hidden} type="hidden" name={name} />
    </div>
  )
}
