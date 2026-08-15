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

export default function RichText({ name = 'contentHtml', defaultValue = '', onDirty }) {
  const editor = useRef(null)
  const hidden = useRef(null)
  const [block, setBlock] = useState('p')

  useEffect(() => {
    if (editor.current && !editor.current.innerHTML) {
      editor.current.innerHTML = defaultValue || '<p></p>'
    }
  }, [defaultValue])

  const sync = () => {
    if (hidden.current && editor.current) hidden.current.value = editor.current.innerHTML
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
    <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-royal-blue">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
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

      <div
        ref={editor}
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
        className="prose-royal min-h-[26rem] max-w-none bg-white px-4 py-3 outline-none"
      />

      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  )
}
