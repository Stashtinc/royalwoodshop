import { useRef, useState } from 'react'

/**
 * Drop area for product photos.
 *
 * Wraps a plain multiple file input, so it still works if JavaScript fails —
 * the drag-and-drop behaviour is an enhancement, not the mechanism.
 */
export default function ImageDropZone({ name = 'images', hint }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const [picked, setPicked] = useState([])

  const describe = (files) => setPicked([...files].map((f) => f.name))

  function onDrop(e) {
    e.preventDefault()
    setOver(false)
    const dropped = e.dataTransfer?.files
    if (!dropped?.length || !inputRef.current) return
    // Hand the dropped files to the real input so a normal submit carries them.
    const dt = new DataTransfer()
    for (const f of dropped) if (f.type.startsWith('image/')) dt.items.add(f)
    inputRef.current.files = dt.files
    describe(dt.files)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        over ? 'border-royal-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
        onChange={(e) => describe(e.target.files)}
        className="hidden"
      />
      <p className="text-sm font-medium text-gray-700">Drag photos here, or click to choose</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {picked.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {picked.map((n) => (
            <li key={n} className="rounded bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200">{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
