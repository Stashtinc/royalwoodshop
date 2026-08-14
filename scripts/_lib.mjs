import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'

export const readCsv = (path) =>
  parse(readFileSync(path, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true })

export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110)

export const num = (v) => {
  const t = String(v ?? '').trim()
  return t === '' || Number.isNaN(Number(t)) ? null : t
}

export const nonEmpty = (v) => {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}
