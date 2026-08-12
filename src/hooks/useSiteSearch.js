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
    if (!query.trim()) return []
    return fuse
      .search(query, { limit })
      .filter((match) => match.score <= MAX_SCORE)
      .map((match) => match.item)
  }, [query, limit])

  return { query, setQuery, results }
}
