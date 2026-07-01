'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import KpiCard from './KpiCard'

export default function RealtimeKpis({ initialPending, initialActiveTrips, initialAvailableVehicles, initialInUseVehicles }) {
  const [pending, setPending] = useState(initialPending)
  const [activeTrips, setActiveTrips] = useState(initialActiveTrips)
  const [availableVehicles, setAvailableVehicles] = useState(initialAvailableVehicles)
  const [inUseVehicles, setInUseVehicles] = useState(initialInUseVehicles)

  useEffect(() => {
    const supabase = createClient()

    async function refreshCounts() {
      const [pendingRes, tripsRes, availRes, inUseRes] = await Promise.all([
        supabase.from('Request').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('Trip').select('id', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
        supabase.from('Vehicle').select('id', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
        supabase.from('Vehicle').select('id', { count: 'exact', head: true }).eq('status', 'IN_USE'),
      ])
      if (pendingRes.count != null) setPending(pendingRes.count)
      if (tripsRes.count != null) setActiveTrips(tripsRes.count)
      if (availRes.count != null) setAvailableVehicles(availRes.count)
      if (inUseRes.count != null) setInUseVehicles(inUseRes.count)
    }

    // Subscribe to Request and Trip changes
    const requestSub = supabase
      .channel('realtime-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Request' }, refreshCounts)
      .subscribe()

    const tripSub = supabase
      .channel('realtime-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Trip' }, refreshCounts)
      .subscribe()

    const vehicleSub = supabase
      .channel('realtime-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Vehicle' }, refreshCounts)
      .subscribe()

    return () => {
      supabase.removeChannel(requestSub)
      supabase.removeChannel(tripSub)
      supabase.removeChannel(vehicleSub)
    }
  }, [])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KpiCard label="Pending requests" value={pending} sub="Awaiting coordinator approval" accent="amber" />
      <KpiCard label="Active trips" value={activeTrips} sub="Currently in progress" accent="sky" />
      <KpiCard label="Available vehicles" value={availableVehicles} sub="Ready for assignment" accent="green" />
      <KpiCard label="Vehicles in use" value={inUseVehicles} sub="Currently on a trip" accent="rose" />
    </div>
  )
}