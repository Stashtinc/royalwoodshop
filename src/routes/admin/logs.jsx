import { Form, Link, useFetcher, useLoaderData, useSearchParams } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listActivity, listActions, listPeople, counts, pruneDetail } from '../../lib/activity.server'
import { recordBuilds } from '../../lib/build-log.server'
import Pagination from '../../components/admin/Pagination'
import { ACTION_LABEL } from '../../lib/activity-labels'

export async function loader({ request }) {
  await requireUser(request)
  const url = new URL(request.url)
  const allowed = [25, 50, 100]
  const requested = Number(url.searchParams.get('perPage') ?? 50)
  const requestedLevel = url.searchParams.get('level')
  const level = ['all', 'development'].includes(requestedLevel) ? requestedLevel : 'content'

  // Detail older than 90 days is removed here rather than by a scheduler, so
  // there is nothing extra to run or keep alive.
  await pruneDetail(90)

  const [activity, actions, totals, people] = await Promise.all([
    listActivity({
      page: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
      perPage: allowed.includes(requested) ? requested : 50,
      level,
      action: url.searchParams.get('action') ?? '',
      q: url.searchParams.get('q') ?? '',
    }),
    listActions(level),
    counts(),
    listPeople(),
  ])
  return { ...activity, actions, level, totals, people }
}

/**
 * Records development work from the git history.
 *
 * Deliberately an action on this page rather than only a command: run as a
 * script it opens the database a second time, and the embedded database
 * allows one writer — which is how a running dev server gets killed. Here it
 * runs inside the server's own process.
 */
export async function action({ request }) {
  await requireUser(request)
  const form = await request.formData()
  if (form.get('intent') !== 'record-builds') return null
  try {
    return { recorded: await recordBuilds() }
  } catch (e) {
    return { recordError: e.message }
  }
}


const TONE = {
  'setup.schema': 'bg-slate-100 text-slate-700 ring-slate-300',
  'setup.catalogue': 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'setup.redirects': 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'import.species': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'site.published': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'product.status': 'bg-amber-50 text-amber-900 ring-amber-200',
  'product.updated': 'bg-blue-50 text-blue-800 ring-blue-200',
  'image.added': 'bg-green-50 text-green-800 ring-green-200',
  'image.updated': 'bg-gray-100 text-gray-700 ring-gray-200',
  'image.deleted': 'bg-red-50 text-red-800 ring-red-200',
  'image.reordered': 'bg-gray-100 text-gray-700 ring-gray-200',
  'auth.login': 'bg-purple-50 text-purple-800 ring-purple-200',
  'post.created': 'bg-blue-50 text-blue-800 ring-blue-200',
  'post.updated': 'bg-blue-50 text-blue-800 ring-blue-200',
  'post.published': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'user.renamed': 'bg-purple-50 text-purple-800 ring-purple-200',
  'image.generated': 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200',
  'ai.article': 'bg-violet-50 text-violet-800 ring-violet-200',
  'ai.metadata': 'bg-violet-50 text-violet-800 ring-violet-200',
  'ai.images': 'bg-violet-50 text-violet-800 ring-violet-200',
  'build.shipped': 'bg-slate-100 text-slate-700 ring-slate-300',
}

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })

function describe(row) {
  // A rolled-up run of edits.
  if (row.group) {
    const first = row.group.at(-1), last = row.group[0]
    const fields = [...new Set(row.group.flatMap((g) => (g.details?.changed ?? []).map((c) => c.field)))]
    return (
      <p className="mt-1 text-xs text-gray-600">
        {row.group.length} products, {timeFormat.format(new Date(first.createdAt))}–
        {timeFormat.format(new Date(last.createdAt))}
        {fields.length > 0 && <> · {fields.slice(0, 6).join(', ')}</>}
      </p>
    )
  }

  const d = row.details
  if (!d) return null
  if (row.action === 'import.species') {
    return (
      <p className="mt-1 text-xs text-gray-600">
        {d.updated} products updated · {d.species} gained species
        {d.availability ? ` · ${d.availability} gained availability` : ''}
        {d.unmatched ? ` · ${d.unmatched} codes not found` : ''}
      </p>
    )
  }
  if (row.action === 'build.shipped') {
    return (
      <p className="mt-1 font-mono text-[11px] text-gray-400">{d.short ?? String(d.hash).slice(0, 10)}</p>
    )
  }
  if (row.action === 'site.published') {
    return (
      <p className="mt-1 text-xs text-gray-600">
        {d.products} products · {d.published} of {d.articles} articles published
      </p>
    )
  }
  if (row.action === 'setup.catalogue') return <p className="mt-1 text-xs text-gray-600">{d.products} products</p>
  if (row.action === 'setup.redirects') return <p className="mt-1 text-xs text-gray-600">{d.redirects} redirects</p>
  if (row.action === 'product.status') return <p className="mt-1 text-xs text-gray-600">{d.from} → {d.to}</p>
  if (row.action === 'product.updated' && Array.isArray(d.changed)) {
    return (
      <ul className="mt-1 flex flex-col gap-0.5">
        {d.changed.map((c, i) => (
          <li key={i} className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">{c.field}</span>
            {': '}
            <span className="text-gray-400 line-through">{String(c.from).slice(0, 60)}</span>
            {' → '}
            <span>{String(c.to).slice(0, 60)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (row.action === 'ai.images') {
    return (
      <p className="mt-1 truncate text-xs text-gray-600" title={d.prompt}>
        {d.rendered} rendered{d.failed ? `, ${d.failed} failed` : ''}
        {d.variation ? ' · variation' : ''}{d.prompt ? ` · ${d.prompt}` : ''}
      </p>
    )
  }
  if (row.action === 'ai.article') {
    return (
      <p className="mt-1 truncate text-xs text-gray-600">
        {d.words} words{d.topic ? ` · ${d.topic}` : ''}
      </p>
    )
  }
  if (row.action === 'image.generated') {
    return <p className="mt-1 truncate text-xs text-gray-600" title={d.prompt}>{d.prompt}</p>
  }
  if (row.action === 'user.renamed') {
    return (
      <p className="mt-1 text-xs text-gray-600">
        <span className="text-gray-400 line-through">{d.from}</span> → {d.to}
      </p>
    )
  }
  if (row.action === 'image.added') return <p className="mt-1 text-xs text-gray-600">{d.count} file{d.count === 1 ? '' : 's'}</p>
  if (d.field) return <p className="mt-1 text-xs text-gray-600">{d.field}: {String(d.to).slice(0, 80)}</p>
  return null
}

export default function Logs() {
  const { rows, total, page, pages, perPage, actions, level, totals, people = [] } = useLoaderData()
  const [params] = useSearchParams()
  const active = params.get('action') ?? ''
  const query = params.get('q') ?? ''

  const recorder = useFetcher()
  const recording = recorder.state !== 'idle'
  const recorded = recorder.data?.recorded
  const recordError = recorder.data?.recordError

  // What the box offers as you type: the plain-English name of every action
  // present in this view, most common first, plus the people who appear in it.
  const suggestions = [
    ...(actions ?? []).map(({ action }) => ACTION_LABEL[action] ?? action),
    ...people,
  ]

  const levelLink = (l) => {
    const p = new URLSearchParams(params)
    if (l === 'content') p.delete('level'); else p.set('level', l)
    p.delete('page'); p.delete('action')
    return `?${p}`
  }
  const tab = (isOn) =>
    `-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors ${
      isOn
        ? 'border-royal-blue font-medium text-tundora'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`


  // Group consecutive entries under a date heading.
  const groups = []
  for (const row of rows) {
    const day = dayFormat.format(new Date(row.createdAt))
    if (!groups.length || groups.at(-1).day !== day) groups.push({ day, items: [] })
    groups.at(-1).items.push(row)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Activity log</h1>
        <p className="mt-1 text-sm text-gray-500">
          {level === 'content'
            ? 'Imports, publishes, and anything that changed what customers see.'
            : level === 'development'
              ? 'Features built and fixes made, from the project history.'
              : 'Everything, including individual edits, image changes and sign-ins.'}
        </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <recorder.Form method="post">
            <input type="hidden" name="intent" value="record-builds" />
            <button type="submit" disabled={recording}
              title="Read the project history and record anything not logged yet"
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
              <svg viewBox="0 0 20 20" className={`h-4 w-4 ${recording ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" /><path d="M16.5 3v3.5H13" />
              </svg>
              {recording ? 'Running…' : 'Run Logs'}
            </button>
          </recorder.Form>

          {recorded && (
            <p className="text-xs text-gray-500">
              {recorded.added > 0
                ? `${recorded.added} added${recorded.skipped ? `, ${recorded.skipped} already recorded` : ''}`
                : 'Already up to date'}
            </p>
          )}
          {recordError && <p className="max-w-xs text-right text-xs text-red-600">{recordError}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-gray-200">
        <Link to={levelLink('content')} className={tab(level === 'content')}>
          Site changes <span className="ml-0.5 text-gray-400">{totals.content}</span>
        </Link>
        <Link to={levelLink('development')} className={tab(level === 'development')}>
          Development <span className="ml-0.5 text-gray-400">{totals.development}</span>
        </Link>
        <Link to={levelLink('all')} className={tab(level === 'all')}>
          Everything <span className="ml-0.5 text-gray-400">{totals.all}</span>
        </Link>

        <details className="group relative -mb-px pb-2.5">
          <summary
            aria-label="What counts as a milestone?"
            className="flex cursor-pointer list-none items-center text-gray-400 hover:text-gray-600 [&::-webkit-details-marker]:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"
              fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9v4.5" /><circle cx="10" cy="6.6" r="0.35" fill="currentColor" stroke="none" />
            </svg>
          </summary>
          <div className="absolute top-8 left-0 z-20 w-80 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-lg">
            <p className="font-medium text-tundora">What goes where?</p>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-gray-600">
              <li>Anything that changed <strong>many products at once</strong> — importing the species sheet, publishing the site.</li>
              <li>Anything that changed <strong>what customers see</strong> — a product being published, hidden or archived.</li>
              <li>Setup events, such as the catalogue and redirects first being loaded.</li>
            </ul>
            <p className="mt-2.5 text-xs leading-relaxed text-gray-500">
              <strong>Development</strong> is the work of building the site itself, taken from the
              project history. It is kept separate because it answers a different question from
              &ldquo;did anything on my site change&rdquo;.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Everything else — editing one field, changing an image, signing in — appears under
              <strong> Everything</strong>, and is kept for 90 days. Runs of edits by one person
              are grouped into a single line.
            </p>
          </div>
        </details>

        {level === 'all' && (
          <span className="pb-2.5 text-xs text-gray-400">Detailed entries are kept for 90 days</span>
        )}
        {level === 'development' && (
          <span className="pb-2.5 text-xs text-gray-400">Recorded by <code className="rounded bg-gray-100 px-1">npm run log:build</code></span>
        )}
      </div>

      {/* One search box in place of a row of chips. The chips grew with every
          new action until they wrapped onto three lines, and a list of every
          possible filter is not a filter. */}
      <Form method="get" role="search" className="flex flex-wrap items-center gap-2">
        {level !== 'content' && <input type="hidden" name="level" value={level} />}
        <div className="relative flex-1 sm:max-w-md">
          <svg viewBox="0 0 20 20" aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 17 17" />
          </svg>
          <input
            name="q"
            type="search"
            list="activity-suggestions"
            defaultValue={query}
            placeholder="Search the log — an article title, a person, or what happened"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm outline-none focus:border-royal-blue"
          />
          <datalist id="activity-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <button type="submit"
          className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark">
          Search
        </button>
        {(query || active) && (
          <Link to={levelLink(level)} className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
        {query && (
          <span className="text-sm text-gray-500">
            {total} {total === 1 ? 'entry' : 'entries'} matching &ldquo;{query}&rdquo;
          </span>
        )}
      </Form>

      <Pagination page={page} pages={pages} total={total} perPage={perPage} />

      {groups.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {level === 'content'
              ? 'No milestones yet. Imports and publishes will appear here.'
              : 'Nothing recorded yet. Edits will appear here as they are made.'}
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.day} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{group.day}</h2>
          <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {group.items.map((row) => (
              <li key={row.id} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
                <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-gray-400">
                  {timeFormat.format(new Date(row.createdAt))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TONE[row.action] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                      {ACTION_LABEL[row.action] ?? row.action}
                    </span>
                    {row.group && (
                      <span className="rounded bg-gray-900/5 px-1.5 py-0.5 text-[11px] text-gray-600">
                        ×{row.group.length}
                      </span>
                    )}
                    {row.entityLabel && !row.group && (
                      row.entityId
                        ? <Link to={`/admin/products/${row.entityId}`} className="truncate text-sm font-medium text-tundora hover:text-royal-blue">
                            {row.entityLabel}
                          </Link>
                        : <span className="truncate text-sm font-medium text-tundora">{row.entityLabel}</span>
                    )}
                  </div>
                  {describe(row)}
                </div>
                <span className="shrink-0 pt-0.5 text-xs text-gray-400">{row.userEmail ?? 'system'}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />
    </div>
  )
}
