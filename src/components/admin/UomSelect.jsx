import { UOM_OPTIONS, normaliseUom } from '../../lib/catalogue-constants'

/** The unit of measure, as the Master's drop-down offers it. A unit not on the list is shown, not lost. */
export default function UomSelect({ defaultValue = null, className }) {
  const value = normaliseUom(defaultValue) ?? ''
  const known = UOM_OPTIONS.some(([v]) => v === value)
  return (
    <select name="uom" defaultValue={value} className={className}>
      <option value="">— not set —</option>
      {UOM_OPTIONS.map(([v, label]) => <option key={v} value={v}>{v} — {label}</option>)}
      {value && !known && <option value={value}>{value}</option>}
    </select>
  )
}
