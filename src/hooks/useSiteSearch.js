import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { searchIndex } from '../data/searchIndex'

const MAX_SCORE = 0.4

// Pages, categories and menu items come from the static index. Products are
// searched live on the server (see /api/search), so they are not in it.
const pageEntries = searchIndex.filter((item) => !item.code)

const fuse = new Fuse(pageEntries, {
  keys: ['label'],
  threshold: 0.3,
  minMatchCharLength: 3,
  ignoreLocation: true,
  includeScore: true,
})

export default function useSiteSearch(limit = 6) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState({ q: '', items: [] })

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => setRemote({ q: trimmed, items: data.results ?? [] }))
        .catch(() => {})
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  const results = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (!q) return []
    const byName = fuse
      .search(query, { limit })
      .filter((match) => match.score <= MAX_SCORE)
      .map((match) => match.item)
    // Descriptions are long, so they match on plain text, not fuzzy scoring.
    const byDescription = q.length >= 3
      ? pageEntries.filter((item) => item.description?.toLowerCase().includes(q) && !byName.includes(item))
      : []
    // Drop a stale product list until the server has answered for this query.
    const products = remote.q === trimmed ? remote.items : []
    return [...byName, ...byDescription].slice(0, limit).concat(products)
  }, [query, trimmed, limit, remote])

  return { query, setQuery, results }
}
