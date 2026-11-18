const STATUS_STYLE = {
  sent: 'bg-green-50 text-green-700 ring-green-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  none: 'bg-gray-100 text-gray-600 ring-gray-500/20',
}

/** Whether an enquiry's notification email went out. */
export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-sans text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status.state]}`}>
      {status.label}
    </span>
  )
}
