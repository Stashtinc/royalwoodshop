/**
 * Google Search Console — read-only reporting for the admin dashboard.
 *
 * Authenticates as a service account via google-auth.server.js, which is
 * shared with the Analytics client.
 *
 * Nothing in this file ever runs during a page render. The loader reads the
 * cache table; refreshes happen after the response is sent. If Google is slow,
 * down, or misconfigured, the dashboard still loads — it just shows older
 * numbers, or an explanation.
 */

import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { getDb } from './db.server'
import { searchConsoleCache } from '../db/schema'
import { SCOPES, accessToken, credentials } from './google-auth.server'

const API = 'https://searchconsole.googleapis.com/webmasters/v3'

/** Google finalises Search Analytics roughly two days behind. Asking for
 *  yesterday returns a partial number that looks like a traffic collapse. */
const LAG_DAYS = 2
const WINDOW_DAYS = 28

/** How long a cached report is considered fresh. The underlying data only
 *  changes once a day, so this is generous and still always current. */
const TTL_MS = 6 * 60 * 60 * 1000

/* ------------------------------------------------------------------ config */

export function siteUrl() {
  return process.env.GSC_SITE_URL?.trim() || ''
}

export function isConfigured() {
  try {
    return Boolean(siteUrl() && credentials())
  } catch {
    return false
  }
}

/**
 * Why it is not configured, when someone clearly tried.
 *
 * Without this a mistyped key looks identical to no key at all — the dashboard
 * would show the "connect me" instructions to someone who has already followed
 * them, with nothing to say what went wrong.
 */
export function configError() {
  const hasKey = Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim())
  const hasSite = Boolean(siteUrl())
  if (!hasKey && !hasSite) return null
  if (hasKey && !hasSite) return 'GSC_SERVICE_ACCOUNT_JSON is set but GSC_SITE_URL is empty.'
  if (!hasKey && hasSite) return `GSC_SITE_URL is set to "${siteUrl()}" but GSC_SERVICE_ACCOUNT_JSON is empty.`
  try {
    credentials()
    return null
  } catch (e) {
    return e.message
  }
}

/* --------------------------------------------------------------- api calls */

async function api(path, init = {}) {
  const token = await accessToken(SCOPES.searchConsole)
  const res = await fetch(`${API}/sites/${encodeURIComponent(siteUrl())}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = body.error?.message || `HTTP ${res.status}`
    if (res.status === 403) {
      throw new Error(
        `${detail} — the service account is probably not a user on this ` +
        `property yet. Add ${credentials().client_email} in Search Console ` +
        `under Settings → Users and permissions.`,
      )
    }
    if (res.status === 404) {
      throw new Error(
        `${detail} — Google does not recognise the property "${siteUrl()}". ` +
        `It must match exactly, including http vs https and www.`,
      )
    }
    throw new Error(detail)
  }
  return body
}

function query(body) {
  return api('/searchAnalytics/query', { method: 'POST', body: JSON.stringify(body) })
}

/* ------------------------------------------------------------------- dates */

function iso(date) {
  return date.toISOString().slice(0, 10)
}

/** The current window and the equally long one before it, for comparison. */
export function periods(windowDays = WINDOW_DAYS) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - LAG_DAYS)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (windowDays - 1))

  const prevEnd = new Date(start)
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setUTCDate(prevStart.getUTCDate() - (windowDays - 1))

  return {
    current: { startDate: iso(start), endDate: iso(end) },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd) },
    windowDays,
  }
}

/* ----------------------------------------------------------------- reports */

const EMPTY_TOTALS = { clicks: 0, impressions: 0, ctr: 0, position: 0 }

function totalsFrom(rows) {
  const row = rows?.[0]
  if (!row) return { ...EMPTY_TOTALS }
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }
}

async function fetchSummary() {
  const { current, previous, windowDays } = periods()
  const [now, before] = await Promise.all([
    query({ ...current, dimensions: [] }),
    query({ ...previous, dimensions: [] }),
  ])
  return {
    windowDays,
    range: current,
    previousRange: previous,
    current: totalsFrom(now.rows),
    previous: totalsFrom(before.rows),
  }
}

async function fetchTrend() {
  const { current } = periods()
  const res = await query({ ...current, dimensions: ['date'], rowLimit: 100 })
  return (res.rows ?? []).map((r) => ({
    date: r.keys[0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
  }))
}

async function fetchDimension(dimension, rowLimit = 10) {
  const { current } = periods()
  const res = await query({ ...current, dimensions: [dimension], rowLimit })
  return (res.rows ?? []).map((r) => ({
    key: r.keys[0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }))
}

/**
 * How many pages actually show up in Google.
 *
 * Search Console's Index Coverage report has no API — Google has never exposed
 * it, and URL Inspection only answers one URL at a time. So this counts the
 * distinct pages that received at least one impression in the window, which is
 * a real, defensible number as long as it is labelled for what it is: pages
 * appearing in search, not pages indexed. A page can be indexed and never shown.
 */
async function fetchCoverage() {
  const { current, windowDays } = periods()
  const res = await query({ ...current, dimensions: ['page'], rowLimit: 25000 })
  const rows = res.rows ?? []
  return {
    pagesInSearch: rows.length,
    pagesWithClicks: rows.filter((r) => (r.clicks ?? 0) > 0).length,
    windowDays,
    truncated: rows.length >= 25000,
  }
}

const REPORTS = {
  summary: fetchSummary,
  trend: fetchTrend,
  queries: () => fetchDimension('query'),
  pages: () => fetchDimension('page'),
  coverage: fetchCoverage,
}

export const REPORT_NAMES = Object.keys(REPORTS)

/* ------------------------------------------------------------------- cache */

async function readCache(site) {
  const db = await getDb()
  const rows = await db.select().from(searchConsoleCache)
    .where(eq(searchConsoleCache.siteUrl, site))
  const out = {}
  for (const row of rows) {
    out[row.report] = {
      data: row.error ? null : safeParse(row.payload),
      error: row.error,
      fetchedAt: row.fetchedAt,
    }
  }
  return out
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function writeCache(site, report, { data, error }) {
  const db = await getDb()
  const values = {
    siteUrl: site,
    report,
    payload: JSON.stringify(data ?? null),
    error: error ?? null,
    fetchedAt: new Date(),
  }
  const existing = await db.select({ id: searchConsoleCache.id })
    .from(searchConsoleCache)
    .where(and(eq(searchConsoleCache.siteUrl, site), eq(searchConsoleCache.report, report)))
    .limit(1)

  if (existing.length) {
    await db.update(searchConsoleCache).set(values)
      .where(eq(searchConsoleCache.id, existing[0].id))
  } else {
    await db.insert(searchConsoleCache).values(values)
  }
}

/** Only one refresh at a time, however many admin tabs are open. */
let refreshing = null

export async function refresh({ force = false } = {}) {
  if (!isConfigured()) return
  if (refreshing) return refreshing

  const site = siteUrl()
  refreshing = (async () => {
    const cached = await readCache(site).catch(() => ({}))
    for (const [name, fn] of Object.entries(REPORTS)) {
      const age = cached[name]?.fetchedAt
        ? Date.now() - new Date(cached[name].fetchedAt).getTime()
        : Infinity
      if (!force && age < TTL_MS) continue
      try {
        await writeCache(site, name, { data: await fn() })
      } catch (e) {
        await writeCache(site, name, { error: e.message }).catch(() => {})
      }
    }
  })().finally(() => { refreshing = null })

  return refreshing
}

/**
 * What the dashboard loader calls. Never throws, never blocks on Google: it
 * returns whatever is cached and reports how stale that is.
 */
export async function getSearchConsole() {
  const site = siteUrl()
  if (!isConfigured()) {
    return { configured: false, siteUrl: site, reports: {}, stale: false, configError: configError() }
  }

  let cached = {}
  try {
    cached = await readCache(site)
  } catch {
    // Table missing (migration not run) — treat as empty, not as a failure.
  }

  const oldest = Object.values(cached)
    .map((r) => (r.fetchedAt ? new Date(r.fetchedAt).getTime() : 0))
    .sort((a, b) => a - b)[0] ?? 0

  return {
    configured: true,
    siteUrl: site,
    reports: cached,
    fetchedAt: oldest ? new Date(oldest).toISOString() : null,
    stale: Date.now() - oldest > TTL_MS,
    empty: Object.keys(cached).length === 0,
  }
}
