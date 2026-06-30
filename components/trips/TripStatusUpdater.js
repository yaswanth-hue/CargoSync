'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function TripStatusUpdater({ trip }) {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [done, setDone] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [lastCoords, setLastCoords] = useState(null)
  const watchRef = useRef(null)
  const intervalRef = useRef(null)

  // Push GPS coords to API every 10s while tracking
  function startGpsTracking() {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }

    setTracking(true)
    setGpsError('')

    function pushCoords(lat, lng) {
      setLastCoords({ lat, lng })
      fetch('/api/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.id, lat, lng }),
      })
    }

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => pushCoords(pos.coords.latitude, pos.coords.longitude),
      () => setGpsError('Could not get location. Check browser permissions.')
    )

    // Then push every 10s
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => pushCoords(pos.coords.latitude, pos.coords.longitude),
        () => {} // silent fail on interval
      )
    }, 10000)
  }

  function stopGpsTracking() {
    setTracking(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
  }

  useEffect(() => {
    return () => stopGpsTracking()
  }, [])

  async function updateStatus(status) {
    setLoading(status)
    await fetch(`/api/trips/${trip.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(null)

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      stopGpsTracking()
    }

    setDone(true)
    setTimeout(() => router.push(`/driver/trips/${trip.id}`), 800)
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">✓</p>
        <p className="text-white font-medium">Status updated</p>
        <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* GPS tracking panel */}
      <div className={`rounded-xl border p-4 ${tracking ? 'border-sky-500/30 bg-sky-500/5' : 'border-gray-800 bg-gray-900'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">GPS tracking</p>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tracking ? 'text-sky-400 bg-sky-400/10 border-sky-400/20' : 'text-gray-500 bg-gray-800 border-gray-700'}`}>
            {tracking ? 'Active' : 'Off'}
          </span>
        </div>

        {lastCoords && (
          <p className="text-xs text-gray-500 mb-3">
            Last: {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)}
          </p>
        )}

        {gpsError && (
          <p className="text-xs text-rose-400 mb-3">{gpsError}</p>
        )}

        {!tracking ? (
          <button
            onClick={startGpsTracking}
            className="w-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Start GPS tracking
          </button>
        ) : (
          <button
            onClick={stopGpsTracking}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm py-2.5 rounded-lg transition-colors"
          >
            Stop tracking
          </button>
        )}
      </div>

      {/* Status buttons */}
      <div className="space-y-3">
        {trip.status === 'PLANNED' && (
          <button
            onClick={() => { startGpsTracking(); updateStatus('IN_PROGRESS') }}
            disabled={!!loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium py-4 rounded-xl transition-colors"
          >
            {loading === 'IN_PROGRESS' ? 'Updating...' : '▶ Start trip'}
          </button>
        )}

        {trip.status === 'IN_PROGRESS' && (
          <button
            onClick={() => updateStatus('COMPLETED')}
            disabled={!!loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-medium py-4 rounded-xl transition-colors"
          >
            {loading === 'COMPLETED' ? 'Updating...' : '✓ Mark as completed'}
          </button>
        )}

        <button
          onClick={() => updateStatus('CANCELLED')}
          disabled={!!loading}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {loading === 'CANCELLED' ? 'Updating...' : 'Report issue / Cancel'}
        </button>
      </div>
    </div>
  )
}