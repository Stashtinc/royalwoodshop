function Highlight({ text, query }) {
  if (!query.trim()) return text
  const q = query.trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-yellow-200 px-0 text-inherit not-italic">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

// Clicking a result stages it as a pill in the search bar (onPick) rather than
// navigating immediately — the arrow button next to the pill submits it.
export default function SearchResultsList({ query, results, onPick }) {
  if (!query.trim()) return null

  if (results.length === 0) {
    return <p className="px-4 py-5 font-body text-sm text-gray-500">No results for "{query}"</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-100">
      {results.map((result) => (
        <li key={`${result.group}-${result.label}`}>
          <button
            type="button"
            onClick={() => onPick(result)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left font-body text-sm text-gray-700 transition-colors hover:bg-royal-blue/5 hover:text-royal-blue"
          >
            <span><Highlight text={result.label} query={query} /></span>
            <span className="shrink-0 font-body text-xs text-gray-400 uppercase">{result.group}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
