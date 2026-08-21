/**
 * Google Analytics 4 — read-only reporting for the admin dashboard.
 *
 * Same shape as search-console.server.js and for the same reasons: cached in
 * the database, refreshed after the response is sent, never blocking a render.
 * If Google is slow, down, or the service account has not been granted access,
 * the dashboard still loads — it shows older numbers, or says what is wrong.
 *
 * The Data API wants the NUMERIC PROPERTY ID (312678442), not the measurement
 * id that goes in the page tag (G-XXXXXXXXXX) and not the account id. They are
 * three different numbers and Google's own UI shows them side by side, so this
 * is the single easiest thing to get wrong here.
 */

import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { getDb } from './db.server'
import { analyticsCache } from '../db/schema'
import { SCOPES, accessToken, credentials, serviceAccountEmail } from './google-auth.server'

const API = 'https://analyticsdata.googleapis.com/v1beta'

/** GA4 finalises the current day as it goes, so "today" is always a partial
 *  number that reads as a collapse. Yesterday is the last complete day. */
const LAG_DAYS = 1
const WINDOW_DAYS = 28
const TTL_MS = 6 * 60 * 60 * 1000

/* ------------------------------------------------------------------ config */

export function propertyId() {
  return (process.env.GA4_PROPERTY_ID || '').trim().replace(/^properties\//, '')
}

export function isConfigured() {
  try {
    return Boolean(propertyId() && credentials())
  } catch {
    return false
  }
}

/** Why it is not configured, when someone clearly tried. Without this a
 *  mistyped id looks identical to no id at all. */
export function configError() {
  const id = propertyId()
  const hasKey = Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim())
  if (!hasKey && !id) return null
  if (hasKey && !id) {
    return 'The service-account key is set but GA4_PROPERTY_ID is empty.'
  }
  if (id && !/^\d{6,}$/.test(id)) {
    return `GA4_PROPERTY_ID is "${id}", which is not a property id. It should be ` +
           'all digits, e.g. 312678442 — not the G-XXXXXXX measurement id.'
  }
  if (!hasKey && id) return 'GA4_PROPERTY_ID is set but GSC_SERVICE_ACCOUNT_JSON is empty.'
  try {
    credentials()
    return null
  } catch (e) {
    return e.message
  }
}

/* --------------------------------------------------------------- api calls */

async function runReport(body) {
  const token = await accessToken(SCOPES.analytics)
  const res = await fetch(`${API}/properties/${propertyId()}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = json.error?.message || `HTTP ${res.status}`
    if (res.status === 403) {
      if (/Data API|has not been used|disabled/i.test(detail)) {
        throw new Error(
          `${detail} — enable "Google Analytics Data API" in the same Google ` +
          'Cloud project the service-account key came from.',
        )
      }
      throw new Error(
        `${detail} — the service account is probably not a user on this ` +
        `property yet. In Analytics: Admin → Property access management → add ` +
        `${serviceAccountEmail()} as a Viewer.`,
      )
    }
    if (res.status === 404) {
      throw new Error(
        `${detail} — Google does not recognise property ${propertyId()}. ` +
        'Check it is the numeric property id, not the account id.',
      )
    }
    throw new Error(detail)
  }
  return json
}

/* ------------------------------------------------------------------- dates */

const iso = (d) => d.toISOString().slice(0, 10)

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

const METRICS = ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration']

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Headline numbers for this window and the one before it.
 *
 * Both ranges go in a single request — GA4 returns one row per date range,
 * tagged in the last dimension slot — which halves the round trips and
 * guarantees the two halves of a comparison came from the same snapshot.
 */
async function fetchSummary() {
  const { current, previous, windowDays } = periods()
  const json = await runReport({
    dateRanges: [{ ...current, name: 'current' }, { ...previous, name: 'previous' }],
    metrics: METRICS.map((name) => ({ name })),
  })

  const blank = Object.fromEntries(METRICS.map((m) => [m, 0]))
  const out = { current: { ...blank }, previous: { ...blank }, windowDays, ...current }
  for (const row of json.rows ?? []) {
    // The date-range name arrives as the final dimension value.
    const which = row.dimensionValues?.at(-1)?.value === 'date_range_1' ? 'previous' : 'current'
    METRICS.forEach((m, i) => { out[which][m] = num(row.metricValues?.[i]?.value) })
  }
  return out
}

/** Daily users and sessions across the window, for the sparkline. */
async function fetchTrend() {
  const { current } = periods()
  const json = await runReport({
    dateRanges: [current],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 400,
  })
  return (json.rows ?? []).map((row) => {
    const d = row.dimensionValues?.[0]?.value ?? ''
    return {
      date: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d,
      users: num(row.metricValues?.[0]?.value),
      sessions: num(row.metricValues?.[1]?.value),
    }
  })
}

/** Most-viewed pages. Path and title together, because a list of bare paths
 *  is unreadable and a list of bare titles hides which URL is which. */
async function fetchPages(limit = 10) {
  const { current } = periods()
  const json = await runReport({
    dateRanges: [current],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit,
  })
  return (json.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? '',
    title: row.dimensionValues?.[1]?.value ?? '',
    views: num(row.metricValues?.[0]?.value),
    users: num(row.metricValues?.[1]?.value),
  }))
}

/** Where the traffic came from. */
async function fetchChannels(limit = 8) {
  const { current } = periods()
  const json = await runReport({
    dateRanges: [current],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit,
  })
  return (json.rows ?? []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: num(row.metricValues?.[0]?.value),
    users: num(row.metricValues?.[1]?.value),
  }))
}

/* ------------------------------------------------------------------- cache */

const REPORTS = {
  summary: fetchSummary,
  trend: fetchTrend,
  pages: fetchPages,
  channels: fetchChannels,
}

async function readCache(property) {
  const db = getDb()
  const rows = await db.select().from(analyticsCache)
    .where(eq(analyticsCache.propertyId, property))
  const out = {}
  for (const row of rows) {
    out[row.report] = {
      data: safeParse(row.payload),
      error: row.error,
      fetchedAt: row.fetchedAt,
    }
  }
  return out
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function writeCache(property, report, { data, error }) {
  const db = getDb()
  const values = {
    propertyId: property,
    report,
    payload: JSON.stringify(data ?? null),
    error: error ?? null,
    fetchedAt: new Date(),
  }
  const existing = await db.select({ id: analyticsCache.id }).from(analyticsCache)
    .where(and(eq(analyticsCache.propertyId, property), eq(analyticsCache.report, report)))
    .limit(1)
  if (existing.length) {
    await db.update(analyticsCache).set(values).where(eq(analyticsCache.id, existing[0].id))
  } else {
    await db.insert(analyticsCache).values(values)
  }
}

/**
 * Refresh every report.
 *
 * Failures are stored, not thrown. A 403 because nobody added the service
 * account is the single likeliest state this thing is ever in, and the
 * dashboard needs to be able to say so.
 */
export async function refresh({ force = false } = {}) {
  if (!isConfigured()) return
  const property = propertyId()
  const cached = await readCache(property)

  await Promise.all(Object.entries(REPORTS).map(async ([name, fetcher]) => {
    const age = cached[name]?.fetchedAt ? Date.now() - new Date(cached[name].fetchedAt).getTime() : Infinity
    if (!force && age < TTL_MS && !cached[name]?.error) return
    try {
      await writeCache(property, name, { data: await fetcher(), error: null })
    } catch (e) {
      await writeCache(property, name, { data: cached[name]?.data ?? null, error: e.message })
    }
  }))
}

export async function getAnalytics() {
  const property = propertyId()
  if (!isConfigured()) {
    return { configured: false, error: configError(), propertyId: property,
             serviceAccount: serviceAccountEmail() }
  }

  const cached = await readCache(property)
  const reports = Object.keys(REPORTS)
  const fetched = reports.map((r) => cached[r]?.fetchedAt).filter(Boolean)
  const oldest = fetched.length ? Math.min(...fetched.map((d) => new Date(d).getTime())) : 0

  return {
    configured: true,
    propertyId: property,
    serviceAccount: serviceAccountEmail(),
    empty: fetched.length === 0,
    stale: !fetched.length || Date.now() - oldest > TTL_MS,
    fetchedAt: fetched.length ? new Date(oldest).toISOString() : null,
    error: reports.map((r) => cached[r]?.error).find(Boolean) ?? null,
    summary: cached.summary?.data ?? null,
    trend: cached.trend?.data ?? [],
    pages: cached.pages?.data ?? [],
    channels: cached.channels?.data ?? [],
  }
}
