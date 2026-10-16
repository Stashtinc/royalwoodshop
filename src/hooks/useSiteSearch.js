import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { searchIndex } from '../data/searchIndex'

const MAX_SCORE = 0.4

const fuse = new Fuse(searchIndex, {
  keys: ['label', 'code'],
  threshold: 0.3,
  minMatchCharLength: 3,
  ignoreLocation: true,
  includeScore: true,
})

export default function useSiteSearch(limit = 6) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const byName = fuse
      .search(query, { limit })
      .filter((match) => match.score <= MAX_SCORE)
      .map((match) => match.item)
    // Descriptions are long, so they match on plain text, not fuzzy scoring.
    const byDescription = q.length >= 3
      ? searchIndex.filter((item) => item.description?.toLowerCase().includes(q) && !byName.includes(item))
      : []
    return [...byName, ...byDescription].slice(0, limit)
  }, [query, limit])

  return { query, setQuery, results }
}
