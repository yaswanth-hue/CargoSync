'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const statusColors = {
  PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  REJECTED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default function ClaimsPanel({ claims, tripId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(null)

  async function handleAction(claimId, action) {
    setLoading(claimId + action)
    await fetch(`/api/trips/${tripId}/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    router.refresh()
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-3">Vendor claims</h2>
        <p className="text-sm text-gray-600 italic">No claims submitted for this trip</p>
      </div>
    )
  }

  const pendingCount = claims.filter((c) => c.status === 'PENDING').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white">
          Vendor claims
          <span className="ml-2 text-xs text-gray-500">({claims.length})</span>
        </h2>
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-amber-400 bg-amber-400/10 border-amber-400/20">
            {pendingCount} pending review
          </span>
        )}
      </div>

      <div className="space-y-4">
        {claims.map((claim) => (
          <div key={claim.id} className="border border-gray-800 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-white font-medium">
                  {claim.type === 'EXTRA_KM' ? '📍 Extra distance' : '⏱ Waiting time'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {claim.user.name} ·{' '}
                  {new Date(claim.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[claim.status]}`}>
                {claim.status.toLowerCase()}
              </span>
            </div>

            {/* Claim details */}
            <div className="space-y-1.5 text-xs mb-3">
              {claim.claimed_km != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Claimed distance</span>
                  <span className="text-white font-medium">{claim.claimed_km} km</span>
                </div>
              )}
              {claim.actual_km != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GPS recorded distance</span>
                  <span className={claim.claimed_km > claim.actual_km * 1.1 ? 'text-rose-400' : 'text-green-400'}>
                    {claim.actual_km.toFixed(2)} km
                  </span>
                </div>
              )}
              {claim.claimed_km != null && claim.actual_km != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Difference</span>
                  <span className={claim.claimed_km > claim.actual_km ? 'text-rose-400' : 'text-green-400'}>
                    {claim.claimed_km > claim.actual_km ? '+' : ''}
                    {(claim.claimed_km - claim.actual_km).toFixed(2)} km
                  </span>
                </div>
              )}
              {claim.claimed_minutes != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Claimed waiting</span>
                  <span className="text-white font-medium">{claim.claimed_minutes} min</span>
                </div>
              )}
              {claim.reason && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Reason</span>
                  <span className="text-gray-300 text-right">{claim.reason}</span>
                </div>
              )}
            </div>

            {/* Verdict */}
            {claim.verdict && (
              <p className={`text-xs px-3 py-2 rounded-lg mb-3 ${
                claim.status === 'APPROVED'
                  ? 'bg-green-500/10 text-green-400'
                  : claim.status === 'REJECTED'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {claim.verdict}
              </p>
            )}

            {/* Manual action buttons for PENDING claims */}
            {claim.status === 'PENDING' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(claim.id, 'approve')}
                  disabled={!!loading}
                  className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === claim.id + 'approve' ? 'Approving...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleAction(claim.id, 'reject')}
                  disabled={!!loading}
                  className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === claim.id + 'reject' ? 'Rejecting...' : '✗ Reject'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}