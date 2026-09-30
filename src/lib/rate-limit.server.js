/**
 * Counts attempts per key (an IP address, an email) in a fixed window, in
 * memory.
 *
 * The site runs as one server process, so memory is enough: no table to
 * create, nothing to clean up. The counts reset when the server restarts,
 * which is fine for slowing down guessing and bots, the only thing this is
 * for.
 *
 *   const limiter = createLimiter({ limit: 5, windowMs: 15 * 60_000 })
 *   if (limiter.retryAfter(key)) → refuse
 *   limiter.hit(key)             → count an attempt
 *   limiter.reset(key)           → forget the key (e.g. after a good login)
 */
const MAX_KEYS = 10_000

export function createLimiter({ limit, windowMs }) {
  const hits = new Map()   // key → { count, resetAt }

  const current = (key, now) => {
    const h = hits.get(key)
    if (h && now >= h.resetAt) { hits.delete(key); return null }
    return h ?? null
  }

  return {
    /** Seconds until `key` may try again; 0 if it may now. */
    retryAfter(key) {
      const now = Date.now()
      const h = current(key, now)
      return h && h.count >= limit ? Math.ceil((h.resetAt - now) / 1000) : 0
    },

    hit(key) {
      const now = Date.now()
      const h = current(key, now)
      if (h) h.count++
      else hits.set(key, { count: 1, resetAt: now + windowMs })
      // Keys that stopped trying are otherwise only removed when seen again.
      // Under a flood of made-up keys (random emails, forged addresses) the
      // oldest are forgotten instead, so memory stays bounded.
      if (hits.size > MAX_KEYS) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k)
        for (const k of hits.keys()) { if (hits.size <= MAX_KEYS) break; hits.delete(k) }
      }
    },

    reset(key) { hits.delete(key) },
  }
}

/** The visitor's address as the proxy in front of the server reports it —
 *  the same reading the contact form stores. */
export const clientIp = (request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
