'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const QUICK_STATUSES = [
  { value: 'IN_PROGRESS', label: 'Start trip', color: 'bg-sky-500 hover:bg-sky-400' },
  { value: 'COMPLETED', label: 'Mark as completed', color: 'bg-green-500 hover:bg-green-400' },
  { value: 'CANCELLED', label: 'Report issue / Cancel', color: 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400' },
]

export default function TripStatusUpdater({ trip }) {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [done, setDone] = useState(false)
  const [tracking, setTracking] = useState(trip.status === 'IN_PROGRESS')
  const [lastPosition, setLastPosition] = useState(null)
  const [pingCount, setPingCount] = useState(0)
  const [gpsError, setGpsError] = useState('')
  const watchIdRef = useRef(null)

  // Start GPS tracking when trip is IN_PROGRESS
  useEffect(() => {
    if (!tracking) return

    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setLastPosition({ lat: latitude, lng: longitude })
        setGpsError('')

        try {
          await fetch('/api/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip_id: trip.id, lat: latitude, lng: longitude }),
          })
          setPingCount((c) => c + 1)
        } catch (e) {
          // silent fail, will retry on next position update
        }
      },
      (err) => {
        setGpsError(err.message || 'Could not get location')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [tracking, trip.id])

  async function updateStatus(status) {
    setLoading(status)
    await fetch(`/api/trips/${trip.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(null)

    if (status === 'IN_PROGRESS') {
      // Start tracking immediately, stay on this page
      setTracking(true)
      return
    }

    // Completed or cancelled — stop tracking and redirect
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    setTracking(false)
    setDone(true)
    setTimeout(() => router.push(`/driver/trips/${trip.id}`), 800)
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-white font-medium">Status updated</p>
        <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* GPS tracking panel — shows once trip is started */}
      {tracking && (
        <div className="bg-gray-900 border border-sky-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <p className="text-sm font-medium text-white">Live GPS tracking</p>
            </div>
            <span className="text-xs text-gray-500">{pingCount} pings sent</span>
          </div>

          {gpsError ? (
            <p className="text-xs text-rose-400">{gpsError}</p>
          ) : lastPosition ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Latitude</p>
                <p className="text-gray-300 font-mono">{lastPosition.lat.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-gray-500">Longitude</p>
                <p className="text-gray-300 font-mono">{lastPosition.lng.toFixed(5)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Waiting for location signal...</p>
          )}
        </div>
      )}

      {/* Status buttons */}
      <div className="space-y-3">
        {QUICK_STATUSES
          .filter((s) => {
            if (trip.status === 'PLANNED' && !tracking) return true
            if (tracking) return s.value !== 'IN_PROGRESS'
            return true
          })
          .map((s) => (
            <button
              key={s.label}
              onClick={() => updateStatus(s.value)}
              disabled={!!loading}
              className={`w-full py-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${s.color || 'bg-gray-800 text-white hover:bg-gray-700'}`}
            >
              {loading === s.value ? 'Updating...' : s.label}
            </button>
          ))}
      </div>
    </div>
  )
}