const statusColors = {
  PENDING: 'text-amber-400 bg-amber-400/10',
  APPROVED: 'text-green-400 bg-green-400/10',
  REJECTED: 'text-rose-400 bg-rose-400/10',
  CONSOLIDATED: 'text-sky-400 bg-sky-400/10',
}

export default function RecentActivity({ requests }) {
  if (!requests?.length) {
    return (
      <div className="text-center py-12 text-gray-600 text-sm">
        No requests yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-800">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between py-3 px-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{req.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{req.destination}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] ?? 'text-gray-400 bg-gray-800'}`}>
              {req.status.toLowerCase()}
            </span>
            <span className="text-xs text-gray-600">
              {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}