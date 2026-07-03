'use client'
import { useState } from 'react'

export default function ClaimSubmitForm({ tripId, existingClaims = [] }) {
  const [type, setType] = useState('EXTRA_KM')
  const [claimedKm, setClaimedKm] = useState('')
  const [claimedMinutes, setClaimedMinutes] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Check if driver already submitted this type
  const alreadySubmitted = existingClaims.some((c) => c.type === type)

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setResult(null)

    const body = { type, reason }
    if (type === 'EXTRA_KM') body.claimed_km = parseFloat(claimedKm)
    if (type === 'WAITING_TIME') body.claimed_minutes = parseInt(claimedMinutes)

    const res = await fetch(`/api/trips/${tripId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to submit claim')
      return
    }

    setResult(data)
  }

  if (result) {
    return (
      <div className={`rounded-xl p-4 border ${
        result.status === 'APPROVED'
          ? 'bg-green-500/5 border-green-500/20'
          : result.status === 'REJECTED'
          ? 'bg-rose-500/5 border-rose-500/20'
          : 'bg-amber-500/5 border-amber-500/20'
      }`}>
        <p className="text-sm font-medium text-white mb-1">
          {result.status === 'APPROVED'
            ? '✓ Claim approved'
            : result.status === 'REJECTED'
            ? '✗ Claim rejected'
            : '⏳ Claim submitted — pending review'}
        </p>
        {result.verdict && (
          <p className="text-xs text-gray-400 mt-1">{result.verdict}</p>
        )}
        {result.type === 'EXTRA_KM' && result.actual_km != null && (
          <div className="mt-2 pt-2 border-t border-gray-800 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">You claimed</span>
              <span className="text-white">{result.claimed_km} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">GPS recorded</span>
              <span className="text-white">{result.actual_km.toFixed(2)} km</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-sm font-medium text-white mb-4">Submit a claim</p>

      <div className="space-y-3">
        {/* Claim type selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Claim type</label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setError('') }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="EXTRA_KM">Extra distance (km)</option>
            <option value="WAITING_TIME">Waiting time (minutes)</option>
          </select>
          {alreadySubmitted && (
            <p className="text-xs text-amber-400 mt-1">
              You already submitted a {type === 'EXTRA_KM' ? 'distance' : 'waiting time'} claim for this trip
            </p>
          )}
        </div>

        {/* Extra KM input */}
        {type === 'EXTRA_KM' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Total distance traveled (km)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={claimedKm}
              onChange={(e) => setClaimedKm(e.target.value)}
              placeholder="e.g. 12.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">
              Auto-validated against GPS trail — claims within 10% tolerance are auto-approved
            </p>
          </div>
        )}

        {/* Waiting time input */}
        {type === 'WAITING_TIME' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Waiting time (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={claimedMinutes}
              onChange={(e) => setClaimedMinutes(e.target.value)}
              placeholder="e.g. 45"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">
              Reviewed manually by coordinator
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Reason <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the situation..."
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            alreadySubmitted ||
            (type === 'EXTRA_KM' && !claimedKm) ||
            (type === 'WAITING_TIME' && !claimedMinutes)
          }
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit claim'}
        </button>
      </div>
    </div>
  )
}