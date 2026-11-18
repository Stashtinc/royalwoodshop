import { Link, useLoaderData } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { listInbox } from '../../lib/inbox.server.js'

export async function loader({ request }) {
  await requireUser(request)
  return { rows: await listInbox() }
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

import StatusBadge from '../../components/admin/StatusBadge'

export default function Inbox() {
  const { rows } = useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-tundora">Inbox</h1>
        <p className="mt-1 font-sans text-sm text-gray-500">
          Website enquiries and quote requests, newest first. Each one was saved before its email was sent.
          If it says <strong>Email failed</strong> or <strong>Not emailed</strong>, follow up by phone or email.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-10 text-center font-sans text-gray-500">
          No enquiries yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-left font-sans text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    <Link to={`/admin/inbox/${r.kind}/${r.id}`} className="hover:text-royal-blue">
                      {dateFormat.format(new Date(r.createdAt))}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.type}</td>
                  <td className="px-4 py-3 font-medium text-tundora">
                    <Link to={`/admin/inbox/${r.kind}/${r.id}`} className="hover:text-royal-blue">{r.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
