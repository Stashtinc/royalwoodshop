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

  useEffect(() => {
    if (editor.current && !editor.current.innerHTML) {
      editor.current.innerHTML = defaultValue || '<p></p>'
    }
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

      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  )
}
