import { Link, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getInboxItem } from '../../lib/inbox.server.js'
import StatusBadge from '../../components/admin/StatusBadge'

export async function loader({ request, params }) {
  await requireUser(request)
  const item = await getInboxItem(params.kind, Number(params.id))
  if (!item) throw new Response('Not found', { status: 404 })
  return { item }
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-sans text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="font-sans text-sm text-tundora">{children || '—'}</dd>
    </div>
  )
}

export default function InboxItem() {
  const { item } = useLoaderData()

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link to="/admin/inbox" className="font-sans text-sm text-royal-blue hover:underline">← Inbox</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-tundora">{item.name}</h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            {item.type} · {dateFormat.format(new Date(item.createdAt))}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.status.state === 'failed' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-sans text-sm text-red-700">
          <p className="font-semibold">The notification email was not sent.</p>
          <p className="mt-1 break-words">{item.emailError}</p>
          <p className="mt-2">Please follow up with {item.name} directly at {item.email}{item.phone ? ` or ${item.phone}` : ''}.</p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-5 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Name">{item.name}</Field>
        <Field label="Company">{item.company}</Field>
        <Field label="Email">
          <a href={`mailto:${item.email}`} className="text-royal-blue hover:underline">{item.email}</a>
        </Field>
        <Field label="Phone">
          {item.phone && <a href={`tel:${item.phone}`} className="text-royal-blue hover:underline">{item.phone}</a>}
        </Field>
      </dl>

      {item.message && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-bold text-tundora">Message</h2>
          <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-5 font-sans text-sm text-gray-800">{item.message}</p>
        </section>
      )}

      {item.items.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-bold text-tundora">Products requested</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left font-sans text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Species</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {item.items.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2 text-tundora">{line.productName}</td>
                    <td className="px-4 py-2 text-gray-600">{line.productCode || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{line.species || '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-800">{line.quantity}{line.uom ? ` ${line.uom}` : ''}</td>
                    <td className="px-4 py-2 text-gray-600">{line.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {item.files.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-bold text-tundora">Attachments</h2>
          <ul className="flex flex-col gap-2 font-sans text-sm">
            {item.files.map((f) => (
              <li key={f.id}>
                <a href={`/admin/inbox/file/${f.id}`} className="text-royal-blue hover:underline">{f.filename}</a>
                <span className="ml-2 text-gray-500">({Math.round(f.sizeBytes / 1024)} KB)</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
