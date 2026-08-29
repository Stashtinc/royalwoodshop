import { useRef, useState } from 'react'
import { Form, Link, useActionData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { parseUpload, analyse, apply } from '../../lib/species-import.server'
import { log } from '../../lib/activity.server'
import { SPECIES, AVAILABILITY } from '../../lib/catalogue-constants'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

/** Where an uploaded sheet waits between preview and apply. */
const STAGING = '.data/imports'

export async function action({ request }) {
  const user = await requireUser(request)
  const form = await request.formData()
  const intent = String(form.get('intent') ?? 'preview')
  const { mkdir, writeFile, readFile, unlink } = await import('node:fs/promises')
  const { randomBytes } = await import('node:crypto')

  if (intent === 'preview') {
    const file = form.get('file')
    if (!file || typeof file === 'string' || file.size === 0) {
      return { error: 'Choose a CSV file first.' }
    }
    if (file.size > 8 * 1024 * 1024) return { error: 'That file is larger than 8 MB.' }

    const buffer = await file.arrayBuffer()

    let parsedSheet
    try { parsedSheet = await parseUpload(buffer, file.name) }
    catch (e) { return { error: e.message } }

    const { summary } = await analyse(parsedSheet.rows)

    // Hold the file so applying it uses exactly what was previewed.
    await mkdir(STAGING, { recursive: true })
    const token = randomBytes(8).toString('hex')
    await writeFile(`${STAGING}/${token}`, Buffer.from(buffer))

    return {
      stage: 'preview',
      token,
      fileName: file.name,
      skipped: parsedSheet.skipped,
      missingColumns: parsedSheet.missingColumns,
      sheetName: parsedSheet.sheetName,
      summary,
    }
  }

  if (intent === 'apply') {
    const token = String(form.get('token') ?? '')
    if (!/^[a-f0-9]{16}$/.test(token)) return { error: 'That upload has expired. Please choose the file again.' }

    let buffer
    try { buffer = await readFile(`${STAGING}/${token}`) }
    catch { return { error: 'That upload has expired. Please choose the file again.' } }

    const { rows } = await parseUpload(buffer, String(form.get('fileName') ?? ''))

    let overrides = {}
    try { const raw = form.get('overrides'); if (raw) overrides = JSON.parse(raw) } catch { /* ignore malformed */ }

    const result = await apply(rows, overrides)
    await unlink(`${STAGING}/${token}`).catch(() => {})

    await log(user, 'import.species', {
      entityType: 'import',
      entityLabel: String(form.get('fileName') ?? 'species sheet'),
      details: {
        updated: result.written,
        species: result.willSetSpecies,
        availability: result.willSetAvailability,
        unmatched: result.unmatched.length,
      },
    })

    return { stage: 'done', result }
  }

  return { error: 'Unrecognised action.' }
}

/* ------------------------------------------------------------------- view */

function Stat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-gray-200 bg-white',
    good: 'border-green-300 bg-green-50',
    warn: 'border-amber-300 bg-amber-50',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-2xl font-bold text-tundora">{value}</p>
      <p className="mt-0.5 text-xs text-gray-600">{label}</p>
    </div>
  )
}

function DropArea() {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  const [name, setName] = useState('')

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false)
        const f = e.dataTransfer?.files?.[0]
        if (!f || !ref.current) return
        const dt = new DataTransfer(); dt.items.add(f)
        ref.current.files = dt.files
        setName(f.name)
      }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        over ? 'border-royal-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      }`}
    >
      <input ref={ref} type="file" name="file"
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? '')} className="hidden" />
      <p className="text-sm font-medium text-gray-700">Drop the spreadsheet here, or click to choose</p>
      <p className="mt-1 text-xs text-gray-500">
        The Excel workbook itself, or a CSV export — either works
      </p>
      {name && <p className="mt-3 inline-block rounded bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200">{name}</p>}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13.5 3.5 16.5 6.5l-10 10H3.5v-3l10-10Z" />
    </svg>
  )
}

function RowEditor({ change, initial, onSave, onCancel }) {
  const [species, setSpecies] = useState(initial.species)
  const [flex, setFlex] = useState(initial.flex)
  const [availability, setAvailability] = useState(initial.availability ?? '')

  function toggleSpecies(s) {
    setSpecies((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  return (
    <div className="col-span-full border-t border-royal-blue/10 bg-blue-50/40 px-4 py-4">
      <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Editing <span className="font-mono text-gray-700">{change.code}</span>
      </p>

      <div className="flex flex-wrap gap-6">
        {/* Species checkboxes */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-gray-600">Species</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {SPECIES.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={species.includes(s)}
                  onChange={() => toggleSpecies(s)}
                  className="h-3.5 w-3.5 rounded accent-royal-blue"
                />
                <span className="text-xs text-gray-700">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Flex */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-600">Options</p>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={flex}
                onChange={(e) => setFlex(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-royal-blue"
              />
              <span className="text-xs text-gray-700">Flex available</span>
            </label>
          </div>

          {/* Availability */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-600">Availability</p>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="rounded border border-gray-300 py-1 pl-2 pr-6 text-xs text-gray-700 outline-none focus:border-royal-blue"
            >
              <option value="">— unchanged —</option>
              {AVAILABILITY.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave({ species, flex, availability: availability || null })}
          className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-blue-dark"
        >
          Save edit
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Import() {
  const data = useActionData()
  const nav = useNavigation()
  const busy = nav.state === 'submitting'
  const s = data?.summary
  const r = data?.result

  const [edits, setEdits] = useState({})
  const [editingCode, setEditingCode] = useState(null)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Import species sheet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload the workbook, or a CSV export of the{' '}
          <span className="font-medium">TO DO — Species</span> tab. You will see what it changes
          before anything is saved.
        </p>
      </div>

      {data?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{data.error}</p>
      )}

      {/* Step 1 */}
      {(!data || data.error) && (
        <Form method="post" encType="multipart/form-data" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="preview" />
          <DropArea />
          <button disabled={busy}
            className="w-fit rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60">
            {busy ? 'Reading…' : 'Check the file'}
          </button>
        </Form>
      )}

      {/* Step 2 — preview */}
      {data?.stage === 'preview' && s && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{data.fileName}</span>
              {data.sheetName && <> · sheet <span className="font-medium">{data.sheetName}</span></>}
              {' '}— {s.rows} product rows
              {data.skipped > 0 && <> (ignored {data.skipped} instruction row{data.skipped === 1 ? '' : 's'} above the headers)</>}
            </p>
          </div>

          {data.missingColumns?.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              These species columns were not in the file, so they will be ignored:{' '}
              {data.missingColumns.join(', ')}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Products will change" value={s.willChange} tone={s.willChange ? 'good' : 'warn'} />
            <Stat label="of them gain species" value={s.willSetSpecies} />
            <Stat label="of them gain availability" value={s.willSetAvailability} />
            <Stat label="Rows left untouched" value={s.blank} />
          </div>

          <p className="text-sm text-gray-600">
            {s.matched} rows in the file matched a product. {s.blank} of those have nothing
            ticked yet and are left exactly as they are — sending the sheet back in batches
            never undoes work already done.
          </p>

          {s.unmatched.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">{s.unmatched.length} product code(s) not found, and will be skipped:</p>
              <p className="mt-1 font-mono text-xs">{s.unmatched.slice(0, 20).join(', ')}{s.unmatched.length > 20 ? ` … and ${s.unmatched.length - 20} more` : ''}</p>
            </div>
          )}

          {s.unknownOther.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Values in the OTHER column that are not a recognised species:</p>
              <p className="mt-1 text-xs">{s.unknownOther.slice(0, 10).join(' · ')}</p>
              <p className="mt-1 text-xs text-amber-700">These are ignored. Recognised species are: {SPECIES.join(', ')}.</p>
            </div>
          )}

          {s.tooManyAvailability.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">More than one availability ticked — availability will be left unchanged for:</p>
              <p className="mt-1 font-mono text-xs">{s.tooManyAvailability.join(', ')}</p>
            </div>
          )}

          {s.changes.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs tracking-wide text-gray-600 uppercase">
                {s.changes.length >= s.willChange
                  ? `All ${s.willChange} change${s.willChange === 1 ? '' : 's'}`
                  : `First ${s.changes.length} of ${s.willChange} changes`}
                <span className="ml-2 normal-case font-normal text-gray-400">— click the pencil to correct any row before applying</span>
              </p>
              <ul>
                {s.changes.map((c) => {
                  const edit = edits[c.code]
                  const display = edit ?? c
                  const isEditing = editingCode === c.code
                  return (
                    <li key={c.code} className="border-b border-gray-100 last:border-0">
                      <div className="flex flex-wrap items-baseline gap-2 px-4 py-2 text-sm">
                        <span className="font-mono text-xs text-gray-500">{c.code}</span>
                        <span className="text-gray-800">{c.name}</span>
                        <span className={`ml-auto text-xs ${edit ? 'font-medium text-royal-blue' : 'text-gray-600'}`}>
                          {display.species.join(', ') || '—'}
                          {display.flex && ' · flex'}
                          {display.availability && ` · ${display.availability.replace('_', ' ')}`}
                          {edit && <span className="ml-1 text-[10px] text-royal-blue/70">(edited)</span>}
                        </span>
                        <button
                          type="button"
                          title="Edit this row"
                          onClick={() => setEditingCode(isEditing ? null : c.code)}
                          className={`ml-1 shrink-0 rounded p-1 transition-colors ${
                            isEditing
                              ? 'bg-royal-blue text-white'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-royal-blue'
                          }`}
                        >
                          <PencilIcon />
                        </button>
                      </div>
                      {isEditing && (
                        <RowEditor
                          change={c}
                          initial={edit ?? { species: c.species, flex: c.flex, availability: c.availability }}
                          onSave={(values) => {
                            setEdits((prev) => ({ ...prev, [c.code]: values }))
                            setEditingCode(null)
                          }}
                          onCancel={() => setEditingCode(null)}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Form method="post">
              <input type="hidden" name="intent" value="apply" />
              <input type="hidden" name="token" value={data.token} />
              <input type="hidden" name="fileName" value={data.fileName} />
              {Object.keys(edits).length > 0 && (
                <input type="hidden" name="overrides" value={JSON.stringify(edits)} />
              )}
              <button disabled={busy || s.willChange === 0}
                className="rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60">
                {busy
                  ? 'Applying…'
                  : s.willChange === 0
                    ? 'Nothing to apply'
                    : `Apply ${s.willChange} change${s.willChange === 1 ? '' : 's'}`}
              </button>
            </Form>
            <Link to="/admin/import" className="text-sm text-gray-600 hover:underline">Choose a different file</Link>
          </div>
        </div>
      )}

      {/* Step 3 — done */}
      {data?.stage === 'done' && r && (
        <div className="flex flex-col gap-5">
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">
            Imported. {r.written} product{r.written === 1 ? '' : 's'} updated.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Products with species, in total" value={r.totals.withSpecies} tone="good" />
            <Stat label="Products with availability, in total" value={r.totals.withAvail} tone="good" />
          </div>
          <p className="text-sm text-gray-600">
            The species and availability filters on the public site show only values that have
            products behind them, so they will reflect this the next time the site is published.
          </p>
          <div className="flex gap-3">
            <Link to="/admin/products" className="rounded-lg bg-royal-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark">
              View products
            </Link>
            <Link to="/admin/import" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:border-gray-400">
              Import another
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
