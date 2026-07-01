'use client'
import { useState, useEffect } from 'react'

export default function TripCostPanel({ tripId }) {
  const [cost, setCost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trips/${tripId}/cost`)
      .then((res) => res.json())
      .then((data) => {
        setCost(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tripId])

  if (loading) {
    return <span className="text-gray-600">—</span>
  }

  if (!cost || cost.gpsPointCount < 2) {
    return <span className="text-gray-600">No GPS data yet</span>
  }

  return (
    <div>
      <p className="text-white">₹{cost.estimatedCost.toLocaleString('en-IN')}</p>
      <p className="text-xs text-gray-600 mt-0.5">{cost.distanceKm} km · ₹{cost.ratePerKm}/km</p>
    </div>
  )
}