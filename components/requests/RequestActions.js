'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestActions({ requestId }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(null)

  async function handleAction(action) {
    setLoading(action)
    await fetch(`/api/requests/${requestId}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3">Coordinator actions</p>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('approve')}
          disabled={!!loading}
          className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving...' : 'Approve request'}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={!!loading}
          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting...' : 'Reject request'}
        </button>
      </div>
    </div>
  )
}