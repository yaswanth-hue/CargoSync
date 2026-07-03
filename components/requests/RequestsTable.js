'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CONSOLIDATED']

const statusColors = {
  PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  REJECTED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  CONSOLIDATED: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
}

const priorityColors = { LOW: 'text-gray-400', MEDIUM: 'text-amber-400', HIGH: 'text-rose-400' }

export default function RequestsTable({ requests, canApprove, currentStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState(null)

  function filterByStatus(status) {
    const params = status === 'ALL' ? '' : `?status=${status}`
    router.push(`/requests${params}`)
  }

  async function handleAction(e, id, action) {
    e.stopPropagation()
    setActionLoading(`${id}-${action}`)
    await fetch(`/api/requests/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-full overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => filterByStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              currentStatus === s ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 text-center py-16 text-gray-600 text-sm">
          No requests found.{' '}
          <Link href="/requests/new" className="text-sky-400 hover:text-sky-300">Create one →</Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Request</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Pickup → Destination</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Priority</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Requester</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                  {canApprove && <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{req.title}</p>
                        {req.is_external && (
                          <span className="text-xs px-1.5 py-0.5 rounded border font-medium text-purple-400 bg-purple-400/10 border-purple-400/20">Ext</span>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-gray-400 text-xs">
                        {req.pickup_location ? (
                          <span>{req.pickup_location} <span className="text-gray-600">→</span> {req.destination}</span>
                        ) : (
                          req.destination
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${priorityColors[req.priority]}`}>{req.priority}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {req.is_external ? req.contact_name : (req.user?.name ?? '—')}
                      {req.user?.department && <span className="text-gray-600 ml-1">· {req.user.department}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[req.status] ?? 'text-gray-400 bg-gray-800'}`}>
                        {req.status.toLowerCase()}
                      </span>
                    </td>
                    {canApprove && (
                      <td className="px-5 py-3.5 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleAction(e, req.id, 'approve')}
                              disabled={!!actionLoading}
                              className="text-xs text-green-400 bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 hover:border-green-400/60 hover:shadow-[0_0_12px_rgba(74,222,128,0.4)] px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
                            >
                              {actionLoading === `${req.id}-approve` ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={(e) => handleAction(e, req.id, 'reject')}
                              disabled={!!actionLoading}
                              className="text-xs text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 border border-rose-400/20 hover:border-rose-400/60 hover:shadow-[0_0_12px_rgba(248,113,113,0.4)] px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
                            >
                              {actionLoading === `${req.id}-reject` ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer active:bg-gray-800 transition-colors"
                onClick={() => router.push(`/requests/${req.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <p className="text-white font-medium text-sm">{req.title}</p>
                    {req.is_external && (
                      <span className="text-xs px-1.5 py-0.5 rounded border font-medium text-purple-400 bg-purple-400/10 border-purple-400/20 flex-shrink-0">Ext</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusColors[req.status] ?? 'text-gray-400 bg-gray-800'}`}>
                    {req.status.toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  {req.pickup_location ? `${req.pickup_location} → ${req.destination}` : req.destination}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className={priorityColors[req.priority]}>{req.priority}</span>
                  <span className="text-gray-600">{req.is_external ? req.contact_name : (req.user?.name ?? '—')}</span>
                  <span className="text-gray-600">
                    {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {canApprove && req.status === 'PENDING' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => handleAction(e, req.id, 'approve')}
                      disabled={!!actionLoading}
                      className="flex-1 text-xs text-green-400 bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 hover:shadow-[0_0_12px_rgba(74,222,128,0.4)] py-1.5 rounded-lg transition-all disabled:opacity-40"
                    >
                      {actionLoading === `${req.id}-approve` ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={(e) => handleAction(e, req.id, 'reject')}
                      disabled={!!actionLoading}
                      className="flex-1 text-xs text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 border border-rose-400/20 hover:shadow-[0_0_12px_rgba(248,113,113,0.4)] py-1.5 rounded-lg transition-all disabled:opacity-40"
                    >
                      {actionLoading === `${req.id}-reject` ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}