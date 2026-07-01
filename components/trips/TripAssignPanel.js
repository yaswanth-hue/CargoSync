'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TripAssignPanel({ trip, drivers, totalWeight }) {
  const router = useRouter()
  const [driverId, setDriverId] = useState(trip.driver_id ?? '')
  const [rate, setRate] = useState(trip.vehicle?.rate_per_km ?? 10)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchError, setDispatchError] = useState('')

  const isDispatched = !!trip.dispatched_at
  const isReadyToDispatch = !!trip.driver_id && !!trip.vehicle_id

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/trips/${trip.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: driverId || null,
        rate_per_km: parseFloat(rate),
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleDispatch() {
    setDispatching(true)
    setDispatchError('')
    const res = await fetch(`/api/trips/${trip.id}/dispatch`, {
      method: 'POST',
    })
    const data = await res.json()
    if (!res.ok) {
      setDispatchError(data.error || 'Failed to dispatch')
      setDispatching(false)
      return
    }
    setDispatching(false)
    router.refresh()
  }

  // Locked state — already dispatched
  if (isDispatched) {
    return (
      <div className="bg-gray-900 border border-green-500/20 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">Assignment & billing</h2>
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-400/10 border-green-400/20">
            ✓ Dispatched
          </span>
        </div>
        <div className="space-y-2 text-sm">
          {trip.driver && (
            <div className="flex justify-between">
              <span className="text-gray-500">Driver</span>
              <span className="text-white">{trip.driver.name}</span>
            </div>
          )}
          {trip.vehicle && (
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="text-white">{trip.vehicle.name} · {trip.vehicle.plate}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Rate</span>
            <span className="text-white">₹{trip.vehicle?.rate_per_km ?? rate}/km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Dispatched at</span>
            <span className="text-white">
              {new Date(trip.dispatched_at).toLocaleString('en-IN', {
                day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Assignment is locked after dispatch. Contact admin to make changes.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white">Assignment & billing</h2>
        {isReadyToDispatch ? (
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-400/10 border-green-400/20">
            ✓ Ready to dispatch
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-amber-400 bg-amber-400/10 border-amber-400/20">
            Pending assignment
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Driver */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Assign driver</label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="">— Unassigned —</option>
            {drivers.length === 0 ? (
              <option disabled>No eligible drivers available</option>
            ) : (
              drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-600 mt-1">
            Only showing drivers not currently on an active trip
          </p>
        </div>

        {/* Rate */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Rate per km (₹)</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">₹</span>
            <input
              type="number"
              min="1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
            />
            <span className="text-gray-500 text-sm">/km</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Final cost = actual GPS distance × this rate after trip completes
          </p>
        </div>

        {/* Load summary */}
        {trip.vehicle && (
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Vehicle</span>
              <span className="text-white">{trip.vehicle.name} · {trip.vehicle.plate}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Cargo load</span>
              <span className={totalWeight / trip.vehicle.capacity_kg > 0.9 ? 'text-rose-400' : 'text-green-400'}>
                {totalWeight} kg / {trip.vehicle.capacity_kg} kg ({((totalWeight / trip.vehicle.capacity_kg) * 100).toFixed(0)}%)
              </span>
            </div>
            {trip.driver && (
              <div className="flex justify-between text-gray-400">
                <span>Current driver</span>
                <span className="text-white">{trip.driver.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !driverId}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors border border-gray-700"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save assignment'}
        </button>

        {!driverId && (
          <p className="text-xs text-center text-gray-600">Select a driver to enable save</p>
        )}

        {/* Dispatch button — only shows when driver is saved */}
        {isReadyToDispatch && (
          <>
            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 mb-3">
                Once dispatched, the assignment will be locked and the driver will be notified.
              </p>
              {dispatchError && (
                <p className="text-xs text-rose-400 mb-2">{dispatchError}</p>
              )}
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {dispatching ? 'Dispatching...' : '🚛 Dispatch trip'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}