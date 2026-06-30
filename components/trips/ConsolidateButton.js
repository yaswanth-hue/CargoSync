'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsolidateButton({ pendingCount }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [isPending, startTransition] = useTransition()

  async function handleConsolidate() {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/trips', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    setResult(data.trips?.length ?? 0)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-3">
      {result !== null && (
        <p className="text-xs text-green-400">
          {result} trip{result !== 1 ? 's' : ''} created
        </p>
      )}
      <button
        onClick={handleConsolidate}
        disabled={loading || pendingCount === 0}
        className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Consolidating...' : 'Run consolidation'}
      </button>
    </div>
  )
}