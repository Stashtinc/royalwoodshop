import { BRAND_COLORS, DEFAULT_STYLE, FONT_OPTIONS, RULE_WEIGHTS, normalizeStyle, stableJson } from '../../lib/catalogue-style'

/*
 * Style controls, in two places:
 *  - FontFields: catalogue-wide fonts, in the Settings tab.
 *  - AppearanceFields: colours, sizes, spacing and rules, in the large page editor.
 * StyleSaveBar saves the working style, which both places edit.
 */

const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-royal-blue'

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 pt-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
      {children}
    </div>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        {options.map((o) => <option key={o.key ?? o.value} value={o.key ?? o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function Range({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-xs text-gray-500">{value}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="accent-royal-blue" />
    </label>
  )
}

/** Royal Wood Shop colours only. */
function Color({ label, value, onChange }) {
  const current = BRAND_COLORS.find((c) => c.hex === value)
  return (
    <div className="flex flex-col gap-2 text-sm text-gray-600">
      <span className="flex items-center justify-between gap-2">
        {label}
        <span className="text-xs text-gray-500">{current?.name}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {BRAND_COLORS.map((c) => (
          <button key={c.hex} type="button" onClick={() => onChange(c.hex)} aria-label={`${label}: ${c.name}`} title={c.name}
            className={`h-6 w-6 rounded-full border ${value === c.hex ? 'ring-2 ring-royal-blue ring-offset-1' : 'border-gray-300'}`}
            style={{ background: c.hex }} />
        ))}
      </span>
    </div>
  )
}

/** A colour that can be switched off. Off stores '' (no colour). */
function OptionalColor({ label, value, fallback, onChange }) {
  const on = Boolean(value)
  return (
    <div className="flex flex-col gap-3">
      <Toggle label={label} checked={on} onChange={(v) => onChange(v ? fallback : '')} />
      {on && <Color label={`${label} colour`} value={value} onChange={onChange} />}
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-royal-blue' : 'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

/** Catalogue-wide fonts. */
export function FontFields({ style, onChange }) {
  const set = (key) => (value) => onChange({ ...style, [key]: value })
  return (
    <div className="flex flex-col gap-4">
      <Select label="Heading font" value={style.headingFont} options={FONT_OPTIONS} onChange={set('headingFont')} />
      <Select label="Body font" value={style.bodyFont} options={FONT_OPTIONS} onChange={set('bodyFont')} />
    </div>
  )
}

/** Colours, sizes, spacing, rules and frame. Used in the page editor, and applies to every page. */
export function AppearanceFields({ style, onChange }) {
  const set = (key) => (value) => onChange({ ...style, [key]: value })
  return (
    <div className="flex flex-col gap-5">
      <Section title="Colours">
        <Color label="Product name" value={style.titleColor} onChange={set('titleColor')} />
        <Color label="Description and prices" value={style.textColor} onChange={set('textColor')} />
        <Color label="Spec labels" value={style.labelColor} onChange={set('labelColor')} />
        <Color label="Product code" value={style.codeColor} onChange={set('codeColor')} />
        <Color label="Rules and frame" value={style.ruleColor} onChange={set('ruleColor')} />
      </Section>

      <Section title="Sizes and spacing">
        <Range label="Product name size" value={style.nameSize} min={9} max={24} unit=" pt" onChange={set('nameSize')} />
        <Range label="Body text size" value={style.bodySize} min={6} max={14} step={0.5} unit=" pt" onChange={set('bodySize')} />
        <Range label="Picture size" value={style.imageSize} min={80} max={220} unit=" pt" onChange={set('imageSize')} />
        <Range label="Space between products" value={style.spacing} min={0} max={40} unit=" pt" onChange={set('spacing')} />
        <Range label="Page padding" value={style.pageMargin} min={18} max={120} unit=" pt" onChange={set('pageMargin')} />
        <Select
          label="Picture position"
          value={style.imagePosition}
          options={[{ key: 'left', label: 'Beside the text' }, { key: 'top', label: 'Above the text' }]}
          onChange={set('imagePosition')}
        />
      </Section>

      <Section title="Product rows">
        <Toggle label="Category and sub-category headings" checked={style.sectionHeadings} onChange={set('sectionHeadings')} />
        <OptionalColor label="Shade each product" value={style.rowShade} fallback="#F1EFEA" onChange={set('rowShade')} />
        <Range label="Padding inside each product" value={style.rowPadding} min={0} max={80} unit=" pt" onChange={set('rowPadding')} />
      </Section>

      <Section title="Hairlines and frame">
        <Toggle label="Rule between products" checked={style.rules} onChange={set('rules')} />
        {style.rules && (
          <Select
            label="Rule weight"
            value={style.ruleWeight}
            options={RULE_WEIGHTS.map((r) => ({ value: String(r.key), label: r.label }))}
            onChange={(v) => set('ruleWeight')(Number(v))}
          />
        )}
        <Toggle label="Solid frame round each page" checked={style.pageBorder} onChange={set('pageBorder')} />
        {style.pageBorder && (
          <Range label="Padding inside the frame" value={style.framePadding} min={0} max={80} unit=" pt" onChange={set('framePadding')} />
        )}
        <Toggle label="Show 'Page N' line" checked={style.pageLabel} onChange={set('pageLabel')} />
      </Section>
    </div>
  )
}

/** Cover title size and colour, shown with the cover's own options. */
export function CoverStyleFields({ style, onChange }) {
  const set = (key) => (value) => onChange({ ...style, [key]: value })
  return (
    <div className="flex flex-col gap-4">
      <Range label="Cover title size" value={style.coverTitleSize} min={14} max={60} unit=" pt" onChange={set('coverTitleSize')} />
      <Color label="Cover title colour" value={style.coverTitleColor} onChange={set('coverTitleColor')} />
    </div>
  )
}

/** Save and reset for the working style. `dirty` says whether it differs from what is stored. */
export function StyleSaveBar({ style, saved, onSave, onReset }) {
  const dirty = stableJson(style) !== stableJson(saved)
  const same = stableJson(normalizeStyle(style)) === stableJson(DEFAULT_STYLE)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onSave} disabled={!dirty}
        className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-40">
        Save style
      </button>
      <button type="button" onClick={onReset} disabled={same}
        className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40">
        Reset to defaults
      </button>
      <span className="text-xs text-gray-500">{dirty ? 'Unsaved style changes' : 'Style saved'}</span>
    </div>
  )
}
