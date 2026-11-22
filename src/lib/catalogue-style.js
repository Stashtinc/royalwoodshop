/*
 * Print style for a catalogue: fonts, colours, sizes, spacing and rules.
 * Shared by the admin preview and the server, so a saved style is cleaned the same way everywhere.
 */

/** Font choices. `stack` is null for "inherit the site font". */
export const FONT_OPTIONS = [
  { key: 'georgia', label: 'Georgia (serif)', stack: 'Georgia, serif' },
  { key: 'garamond', label: 'Garamond (serif)', stack: 'Garamond, "EB Garamond", Georgia, serif' },
  { key: 'times', label: 'Times New Roman (serif)', stack: '"Times New Roman", Times, serif' },
  { key: 'helvetica', label: 'Helvetica (sans)', stack: 'Helvetica, Arial, sans-serif' },
  { key: 'verdana', label: 'Verdana (sans)', stack: 'Verdana, Geneva, sans-serif' },
  { key: 'courier', label: 'Courier (mono)', stack: '"Courier New", Courier, monospace' },
  { key: 'site', label: 'Site font', stack: null },
]

export const FONT_STACK = Object.fromEntries(FONT_OPTIONS.map((f) => [f.key, f.stack]))

/** Colour swatches offered beside each colour picker. */
/** The Royal Wood Shop colours, from the design kit. Colour options are limited to these. */
export const BRAND_COLORS = [
  { name: 'Royal Blue', hex: '#0065AB' },
  { name: 'Royal Blue Dark', hex: '#004F87' },
  { name: 'Coffee Bean', hex: '#24140D' },
  { name: 'Tundora', hex: '#343333' },
  { name: 'Parchment', hex: '#F1EFEA' },
  { name: 'Cream', hex: '#F0EDE5' },
  { name: 'White', hex: '#FFFFFF' },
]
export const COLOR_SWATCHES = BRAND_COLORS.map((c) => c.hex)
const BRAND_HEX = new Set(COLOR_SWATCHES)

export const RULE_WEIGHTS = [
  { key: 0.5, label: 'Hairline (0.5 pt)' },
  { key: 1, label: 'Fine (1 pt)' },
  { key: 2, label: 'Medium (2 pt)' },
]

export const DEFAULT_STYLE = {
  headingFont: 'georgia',
  bodyFont: 'site',
  titleColor: '#24140D',
  textColor: '#343333',
  labelColor: '#343333',
  codeColor: '#343333',
  ruleColor: '#343333',
  nameSize: 14,
  bodySize: 9.5,
  imageSize: 150,
  spacing: 14,
  imagePosition: 'left', // 'left' or 'top'
  rules: false, // a rule between products on a page
  ruleWeight: 0.5,
  pageBorder: false, // a solid frame round each page
  pageLabel: true, // the small "PAGE N" line at the top of each page
  pageMargin: 54, // space between the page edge and the frame, in points
  framePadding: 0, // space between the frame line and the content, when the frame is on
  rowShade: '', // background colour of each product row; '' for none
  rowPadding: 0, // space inside each product row, around its content
  coverTitleSize: 30,
  coverTitleColor: '#24140D',
}

const clamp = (v, min, max, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)
/** Only brand colours are kept; anything else falls back to the default. */
const color = (v, fallback) => (typeof v === 'string' && BRAND_HEX.has(v.toUpperCase()) ? v.toUpperCase() : fallback)

/** Returns a complete, safe style: unknown keys dropped, values clamped, missing ones defaulted. */
export function normalizeStyle(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_STYLE
  return {
    headingFont: pick(s.headingFont, FONT_OPTIONS.map((f) => f.key), d.headingFont),
    bodyFont: pick(s.bodyFont, FONT_OPTIONS.map((f) => f.key), d.bodyFont),
    titleColor: color(s.titleColor, d.titleColor),
    textColor: color(s.textColor, d.textColor),
    labelColor: color(s.labelColor, d.labelColor),
    codeColor: color(s.codeColor, d.codeColor),
    ruleColor: color(s.ruleColor, d.ruleColor),
    nameSize: clamp(s.nameSize, 9, 24, d.nameSize),
    bodySize: clamp(s.bodySize, 6, 14, d.bodySize),
    imageSize: clamp(s.imageSize, 80, 220, d.imageSize),
    spacing: clamp(s.spacing, 0, 40, d.spacing),
    imagePosition: pick(s.imagePosition, ['left', 'top'], d.imagePosition),
    rules: typeof s.rules === 'boolean' ? s.rules : d.rules,
    ruleWeight: pick(Number(s.ruleWeight), RULE_WEIGHTS.map((r) => r.key), d.ruleWeight),
    pageBorder: typeof s.pageBorder === 'boolean' ? s.pageBorder : d.pageBorder,
    pageLabel: typeof s.pageLabel === 'boolean' ? s.pageLabel : d.pageLabel,
    pageMargin: clamp(s.pageMargin, 18, 120, d.pageMargin),
    framePadding: clamp(s.framePadding, 0, 80, d.framePadding),
    rowShade: s.rowShade === '' ? '' : color(s.rowShade, d.rowShade),
    rowPadding: clamp(s.rowPadding, 0, 80, d.rowPadding),
    coverTitleSize: clamp(s.coverTitleSize, 14, 60, d.coverTitleSize),
    coverTitleColor: color(s.coverTitleColor, d.coverTitleColor),
  }
}

/**
 * The stored style: the catalogue-wide settings, plus `pageStyles`, a map from a page's
 * first product (its catalogue item id) to that page's own settings. Only pages set to
 * custom have an entry.
 */
export function normalizeStoredStyle(raw) {
  const base = normalizeStyle(raw)
  const src = raw && typeof raw === 'object' && raw.pageStyles && typeof raw.pageStyles === 'object' ? raw.pageStyles : {}
  const pageStyles = {}
  for (const [key, value] of Object.entries(src)) {
    if (/^\d+$/.test(key)) pageStyles[key] = normalizeStyle(value)
  }
  return { ...base, pageStyles }
}

/** JSON with keys sorted, so two equal styles always compare equal. */
export function stableJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]))
    return v
  }
  return JSON.stringify(sort(value))
}
