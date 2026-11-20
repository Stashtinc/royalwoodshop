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

/** Material Symbols icon. The font is loaded by the site head. */
function MI({ name }) {
  return <span aria-hidden="true" className="material-symbols-outlined text-[20px] leading-none">{name}</span>
}

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
  // Edit with AI: the highlighted text, where its button sits, and the change box.
  const [sel, setSel] = useState(null)
  // Image size controls: the image tapped in the editor and where its panel sits.
  const [imgSel, setImgSel] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  // Keep the highlighted passage visibly selected while the change box has focus.
  // The CSS Custom Highlight API paints it without changing the article text.
  useEffect(() => {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return
    if (aiOpen && savedRange.current) CSS.highlights.set('rws-ai-edit', new Highlight(savedRange.current))
    else CSS.highlights.delete('rws-ai-edit')
    return () => CSS.highlights?.delete('rws-ai-edit')
  }, [aiOpen])
  const [aiError, setAiError] = useState('')

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

  // Highlighting text in the editor shows an Edit with AI button beside it.
  const readEditorSelection = () => {
    if (aiOpen) return
    const s = window.getSelection()
    const el = editor.current
    if (!s || s.isCollapsed || !el || !el.contains(s.anchorNode)) { setSel(null); return }
    const text = s.toString().trim()
    if (text.length < 3) { setSel(null); return }
    const range = s.getRangeAt(0)
    savedRange.current = range.cloneRange()
    const rect = range.getBoundingClientRect()
    setSel({ text, top: rect.bottom + 6, left: Math.max(8, rect.left) })
    setAiError('')
  }

  const restoreSelection = () => {
    editor.current?.focus()
    if (!savedRange.current) return
    const s = window.getSelection()
    s.removeAllRanges()
    s.addRange(savedRange.current)
  }

  const closeAi = () => {
    setAiOpen(false)
    setAiInstruction('')
    setAiError('')
  }

  // Rewrites only the highlighted passage, then puts it back in the same place.
  const runAi = async () => {
    if (!sel || !aiInstruction.trim() || aiBusy) return
    setAiBusy(true)
    setAiError('')
    try {
      const res = await fetch('/admin/editor-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          passage: sel.text,
          instruction: aiInstruction.trim(),
          context: editor.current?.innerText ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.html) throw new Error(data.error || 'The change could not be made. Try again.')
      restoreSelection()
      document.execCommand('insertHTML', false, data.html)
      sync()
      setSel(null)
      closeAi()
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiBusy(false)
    }
  }

  // Tapping an image in the editor opens its size controls; tapping anything else closes them.
  const pickImage = (e) => {
    const t = e.target
    if (t && t.tagName === 'IMG' && editor.current?.contains(t)) {
      const r = t.getBoundingClientRect()
      setImgSel({ el: t, top: r.bottom + 8, left: Math.max(8, r.left) })
    } else {
      setImgSel(null)
    }
  }

  const placeImgPanel = (el) => {
    const r = el.getBoundingClientRect()
    setImgSel({ el, top: r.bottom + 8, left: Math.max(8, r.left) })
  }

  const resizeImg = (px) => {
    const el = imgSel?.el
    if (!el || !editor.current) return
    const max = editor.current.clientWidth - 24
    el.style.width = `${Math.max(40, Math.min(max, Math.round(px)))}px`
    el.style.height = 'auto'
    el.style.maxWidth = '100%'
    sync()
    placeImgPanel(el)
  }

  // Text wrap: 'left' and 'right' float the image so text runs beside it; 'none' keeps it on its own line.
  const wrapImg = (mode) => {
    const el = imgSel?.el
    if (!el) return
    if (mode === 'left') {
      el.style.float = 'left'
      el.style.margin = '0.25em 1.25em 0.75em 0'
    } else if (mode === 'right') {
      el.style.float = 'right'
      el.style.margin = '0.25em 0 0.75em 1.25em'
    } else {
      el.style.float = 'none'
      el.style.display = 'block'
      el.style.margin = '0.75em auto'
    }
    sync()
    placeImgPanel(el)
  }

  const resetImg = () => {
    const el = imgSel?.el
    if (!el) return
    el.style.width = ''
    el.style.height = ''
    el.style.maxWidth = ''
    sync()
    placeImgPanel(el)
  }

  const removeImg = () => {
    const el = imgSel?.el
    if (!el) return
    el.remove()
    sync()
    setImgSel(null)
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
    <div className="flex flex-col rounded-lg border border-gray-300 focus-within:border-royal-blue">
      {/* The passage being changed with Edit with AI. Set here, not in the stylesheet, so the build cannot drop it. */}
      <style>{'::highlight(rws-ai-edit){background-color:#bfdbfe;color:inherit}'}</style>
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <div className={`flex flex-wrap items-center gap-1 ${htmlMode ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={htmlMode}>
        <select
          value={block}
          onChange={(e) => exec('formatBlock', e.target.value)}
          className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none"
        >
          {BLOCKS.map(([tag, label]) => <option key={tag} value={tag}>{label}</option>)}
        </select>

        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Bold" onClick={() => exec('bold')}><MI name="format_bold" /></Btn>
        <Btn title="Italic" onClick={() => exec('italic')}><MI name="format_italic" /></Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><MI name="format_list_bulleted" /></Btn>
        <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><MI name="format_list_numbered" /></Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Insert image" onClick={openPicker}><MI name="image" /></Btn>
        <Btn title="Add link" onClick={addLink}><MI name="link" /></Btn>
        <Btn title="Remove link" onClick={() => exec('unlink')}><MI name="link_off" /></Btn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Btn title="Clear formatting" onClick={() => exec('removeFormat')}><MI name="format_clear" /></Btn>
        </div>

        <span className="mx-1 ml-auto h-5 w-px bg-gray-300" />
        <Btn title={htmlMode ? 'Back to the visual editor' : 'Edit the HTML source'} active={htmlMode} onClick={toggleHtml}>
          <span className="flex items-center gap-1 font-mono text-xs font-semibold"><MI name="code" />HTML</span>
        </Btn>
      </div>

      {imgSel && (
        <div role="toolbar" aria-label="Image size"
          style={{ position: 'fixed', top: imgSel.top, left: Math.min(imgSel.left, window.innerWidth - 330) }}
          className="fixed z-[70] flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white p-1.5 font-sans text-sm shadow-xl">
          <Btn title="Smaller" onClick={() => resizeImg(imgSel.el.getBoundingClientRect().width - 40)}><MI name="remove" /></Btn>
          <span className="min-w-[4.5rem] text-center text-gray-700">{Math.round(imgSel.el.getBoundingClientRect().width)} px</span>
          <Btn title="Larger" onClick={() => resizeImg(imgSel.el.getBoundingClientRect().width + 40)}><MI name="add" /></Btn>
          <span className="mx-1 h-5 w-px bg-gray-300" />
          <Btn title="Full width" onClick={() => resizeImg(editor.current.clientWidth - 24)}><MI name="fullscreen" /></Btn>
          <Btn title="Original size" onClick={resetImg}><MI name="restart_alt" /></Btn>
          <span className="mx-1 h-5 w-px bg-gray-300" />
          <Btn title="Text wraps around the image, on the left" onClick={() => wrapImg('left')}>
            <span className="flex items-center gap-1 text-xs"><MI name="float_left" />Wrap left</span>
          </Btn>
          <Btn title="Image sits on its own line, no wrap" onClick={() => wrapImg('none')}>
            <span className="flex items-center gap-1 text-xs"><MI name="block" />No wrap</span>
          </Btn>
          <Btn title="Text wraps around the image, on the right" onClick={() => wrapImg('right')}>
            <span className="flex items-center gap-1 text-xs"><MI name="float_right" />Wrap right</span>
          </Btn>
          <span className="mx-1 h-5 w-px bg-gray-300" />
          <Btn title="Remove image" onClick={removeImg}><MI name="delete" /></Btn>
        </div>
      )}

      {sel && !aiOpen && (
        <button type="button" style={{ position: 'fixed', top: sel.top, left: sel.left }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setAiOpen(true)}
          className="fixed z-[70] flex items-center gap-1.5 rounded-full bg-royal-blue px-3 py-1.5 font-sans text-sm font-medium text-white shadow-lg hover:bg-royal-blue-dark">
          <MI name="auto_awesome" /> Edit with AI
        </button>
      )}

      {aiOpen && sel && (
        <div role="dialog" aria-label="Edit with AI"
          style={{ position: 'fixed', top: sel.top, left: Math.min(sel.left, window.innerWidth - 340) }}
          className="fixed z-[70] flex w-[min(90vw,330px)] flex-col gap-2 rounded-lg border border-royal-blue bg-white p-3 font-sans text-sm shadow-xl">
          <p className="text-xs text-gray-500">
            Change: “{sel.text.length > 90 ? `${sel.text.slice(0, 90)}…` : sel.text}”
          </p>
          <div className="flex gap-2">
            <input autoFocus value={aiInstruction} disabled={aiBusy}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runAi() } if (e.key === 'Escape') closeAi() }}
              placeholder="Add change request here..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-royal-blue" />
            <button type="button" onClick={runAi} disabled={aiBusy || !aiInstruction.trim()}
              className="shrink-0 rounded-lg bg-royal-blue px-3 py-2 font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">
              {aiBusy ? 'Changing…' : 'Change'}
            </button>
          </div>
          {aiError && <p className="text-red-600">{aiError}</p>}
          <button type="button" onClick={closeAi} className="self-end text-gray-500 hover:underline">Cancel</button>
        </div>
      )}

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
          className="min-h-[24rem] resize-y bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-800 outline-none"
        />
      )}

      <div
        ref={editor}
        hidden={htmlMode}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onClick={pickImage}
        onKeyUp={() => { readBlock(); readEditorSelection() }}
        onMouseUp={() => { readBlock(); readEditorSelection() }}
        // Paste as plain text, so pasting from Word does not import its markup.
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          sync()
        }}
        className="prose-royal min-h-[24rem] max-w-none bg-white px-4 py-3 outline-none"
      />

      {/* No defaultValue: React would reset this field on re-render, wiping the content sent on save. sync() keeps it current. */}
      <input ref={hidden} type="hidden" name={name} />
    </div>
  )
}
