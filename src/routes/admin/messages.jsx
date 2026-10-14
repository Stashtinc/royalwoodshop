import { useFetcher, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import Pagination from '../../components/admin/Pagination'
import Toast from '../../components/admin/Toast'

export async function loader({ request }) {
  await requireUser(request)
  const { listMessages, emailSettings } = await import('../../lib/contact.server')
  const url = new URL(request.url)
  const list = await listMessages({ page: Number(url.searchParams.get('page') ?? 1) })
  return { ...list, settings: emailSettings() }
}

export async function action({ request }) {
  const user = await requireUser(request)
  const { resendMessage, sendTestEmail, emailSettings } = await import('../../lib/contact.server')
  const form = await request.formData()
  const intent = form.get('intent')
  if (!emailSettings().ready) return { error: 'Email is not set up yet — see the steps at the top of this page.' }

  if (intent === 'test') {
    const sent = await sendTestEmail(user.email)
    return sent.ok
      ? { done: `Test email sent to ${emailSettings().to}. Check that inbox (and Spam).` }
      : { error: `Google refused the email: ${sent.error}` }
  }
  if (intent === 'resend') {
    const sent = await resendMessage(Number(form.get('id')))
    return sent.ok ? { done: 'Enquiry emailed.' } : { error: `Could not email it: ${sent.error}` }
  }
  if (intent === 'resend-all') {
    const { listMessages } = await import('../../lib/contact.server')
    const { rows } = await listMessages({ perPage: 200 })
    const waiting = rows.filter((r) => !r.emailedAt)
    let ok = 0, lastError = null
    for (const r of waiting) {
      const sent = await resendMessage(r.id)
      if (sent.ok) ok++; else lastError = sent.error
    }
    return lastError
      ? { error: `${ok} of ${waiting.length} emailed. Last error: ${lastError}` }
      : { done: `${ok} enquir${ok === 1 ? 'y' : 'ies'} emailed.` }
  }
  return null
}

const when = new Intl.DateTimeFormat('en-CA', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

function Setup({ settings }) {
  if (settings.ready) return null
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="font-medium">Enquiries are being saved here, but not emailed yet.</p>
      <p className="mt-1">
        To get them by email, add these settings in Railway (production → royalwoodshop → Variables):{' '}
        {settings.missing.map((k, i) => (
          <span key={k}>{i ? ', ' : ''}<code className="rounded bg-amber-100 px-1">{k}</code></span>
        ))}
        . The setup guide is <em>Royal Wood Shop - Contact Form Email Setup.docx</em>. Once they're in,
        come back here and press <strong>Send test email</strong>.
      </p>
    </div>
  )
}

function Status({ row, ready }) {
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'
  if (row.emailedAt) {
    return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">Emailed</span>
  }
  return (
    <div className="flex items-center gap-2">
      <span title={row.emailError ?? ''}
        className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200">
        Not emailed
      </span>
      {ready && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="resend" />
          <input type="hidden" name="id" value={row.id} />
          <button disabled={busy} className="text-xs font-medium text-royal-blue hover:underline disabled:opacity-50">
            {busy ? 'Sending…' : 'Email it'}
          </button>
        </fetcher.Form>
      )}
    </div>
  )
}

export default function Messages() {
  const { rows, total, unsent, page, pages, perPage, settings } = useLoaderData()
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'
  const data = fetcher.data

  return (
    <div className="flex flex-col gap-5">
      <Toast message={data?.done} stamp={data} />
      <Toast message={data?.error} stamp={data} tone="error" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-tundora">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enquiries from the Contact page.{' '}
            {settings.ready
              ? <>Each one is emailed to <strong className="font-medium text-gray-700">{settings.to}</strong>.</>
              : 'Every one is kept here, even when email is not working.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.ready && unsent > 0 && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="resend-all" />
              <button disabled={busy}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Email the {unsent} not emailed
              </button>
            </fetcher.Form>
          )}
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="test" />
            <button disabled={busy || !settings.ready}
              title={settings.ready ? `Sends a test to ${settings.to}` : 'Set up email first'}
              className="rounded-lg bg-royal-blue px-3.5 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-50">
              {busy && fetcher.formData?.get('intent') === 'test' ? 'Sending…' : 'Send test email'}
            </button>
          </fetcher.Form>
        </div>
      </div>

      <Setup settings={settings} />

      {total > perPage && <Pagination page={page} pages={pages} total={total} perPage={perPage} />}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          No messages yet. Enquiries sent from the Contact page will appear here.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {rows.map((r) => (
            <li key={r.id} className="border-b border-gray-100 px-5 py-4 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-tundora">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    <a href={`mailto:${r.email}`} className="text-royal-blue hover:underline">{r.email}</a>
                    {r.phone && <> · <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a></>}
                    {' · '}{when.format(new Date(r.createdAt))}
                  </p>
                </div>
                <Status row={r} ready={settings.ready} />
              </div>
              <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{r.message}</p>
            </li>
          ))}
        </ul>
      )}

      {total > perPage && <Pagination page={page} pages={pages} total={total} perPage={perPage} compact />}
    </div>
  )
}
