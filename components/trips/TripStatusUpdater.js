'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = ['PLANNED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED']
const STEP_LABELS = {
  PLANNED: 'Dispatched',
  PICKED_UP: 'Picked up',
  IN_PROGRESS: 'En route',
  COMPLETED: 'Delivered',
}

export default function TripStatusUpdater({ trip }) {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [done, setDone] = useState(false)
  const [tracking, setTracking] = useState(trip.status === 'IN_PROGRESS')
  const [lastPosition, setLastPosition] = useState(null)
  const [pingCount, setPingCount] = useState(0)
  const [gpsError, setGpsError] = useState('')
  const [step, setStep] = useState(trip.status)
  const watchIdRef = useRef(null)

  useEffect(() => {
    if (!tracking) return
    if (!navigator.geolocation) {
      setTimeout(() => setGpsError('GPS not supported on this device'), 0)
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
            body: JSON.stringify({
              trip_id: trip.id,
              lat: latitude,
              lng: longitude,
            }),
          })
          setPingCount((c) => c + 1)
        } catch (e) {}
      },
      (err) => setGpsError(err.message || 'Could not get location'),
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
    setStep(status)

    if (status === 'IN_PROGRESS') {
      setTracking(true)
      return
    }

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      setTracking(false)
      setDone(true)
      setTimeout(() => router.push(`/driver/trips/${trip.id}`), 800)
    }
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

      {/* Step progress indicator */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Trip progress</p>
        <div className="flex items-start">
          {STEPS.map((s, i) => {
            const currentIdx = STEPS.indexOf(step === 'CANCELLED' ? 'PLANNED' : step)
            const thisIdx = i
            const isDone = thisIdx < currentIdx
            const isCurrent = thisIdx === currentIdx

            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors ${
                    isDone
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-600'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs mt-1.5 text-center leading-tight ${
                    isCurrent ? 'text-sky-400' : isDone ? 'text-green-400' : 'text-gray-600'
                  }`}>
                    {STEP_LABELS[s]}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-5 mx-1 ${
                    isDone ? 'bg-green-500' : 'bg-gray-800'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* GPS tracking panel — shows only when IN_PROGRESS */}
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

      {/* Step 1 — Confirm pickup (at the pickup point, before driving) */}
      {step === 'PLANNED' && (
        <div className="space-y-3">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400 font-medium mb-1">Before you start driving</p>
            <p className="text-xs text-gray-500">
              Go to the pickup point, load all cargo listed in the manifest, then confirm pickup below.
              GPS tracking will NOT start yet.
            </p>
          </div>
          <button
            onClick={() => updateStatus('PICKED_UP')}
            disabled={!!loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-4 rounded-xl transition-colors"
          >
            {loading === 'PICKED_UP' ? 'Confirming...' : '📦 Confirm cargo picked up'}
          </button>
        </div>
      )}

      {/* Step 2 — Start driving, GPS begins now */}
      {step === 'PICKED_UP' && (
        <div className="space-y-3">
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
            <p className="text-xs text-sky-400 font-medium mb-1">Cargo loaded ✓</p>
            <p className="text-xs text-gray-500">
              When you&apos;re ready to drive to the destination, tap the button below.
              GPS tracking will begin and record your route for distance and cost calculation.
            </p>
          </div>
          <button
            onClick={() => updateStatus('IN_PROGRESS')}
            disabled={!!loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-4 rounded-xl transition-colors"
          >
            {loading === 'IN_PROGRESS' ? 'Starting GPS...' : '🚛 Start driving — begin GPS tracking'}
          </button>
        </div>
      )}

      {/* Step 3 — Mark as delivered */}
      {step === 'IN_PROGRESS' && tracking && (
        <button
          onClick={() => updateStatus('COMPLETED')}
          disabled={!!loading}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-4 rounded-xl transition-colors"
        >
          {loading === 'COMPLETED' ? 'Completing...' : '✓ Mark as delivered'}
        </button>
      )}

      {/* Cancel — always available until completed */}
      {!['COMPLETED', 'CANCELLED'].includes(step) && (
        <button
          onClick={() => updateStatus('CANCELLED')}
          disabled={!!loading}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {loading === 'CANCELLED' ? 'Cancelling...' : 'Report issue / Cancel trip'}
        </button>
      )}
    </div>
  )
}