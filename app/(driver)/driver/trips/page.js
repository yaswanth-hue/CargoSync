import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const statusColors = {
  PLANNED: 'text-gray-400 bg-gray-800 border-gray-700',
  IN_PROGRESS: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default async function DriverTripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trips = await prisma.trip.findMany({
    where: { status: { in: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] } },
    orderBy: { scheduled_at: 'desc' },
    include: {
      vehicle: true,
      requests: { select: { id: true, title: true, weight_kg: true, destination: true } },
      waypoints: { orderBy: { order: 'asc' } },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeTrips = trips.filter((t) => ['PLANNED', 'IN_PROGRESS'].includes(t.status))
  const completedTrips = trips.filter((t) => ['COMPLETED', 'CANCELLED'].includes(t.status))

  const todayTrips = activeTrips.filter((t) => {
    const d = new Date(t.scheduled_at)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const upcomingTrips = activeTrips.filter((t) => {
    const d = new Date(t.scheduled_at)
    d.setHours(0, 0, 0, 0)
    return d.getTime() > today.getTime()
  })

  function TripCard({ trip }) {
    const totalWeight = trip.requests.reduce((s, r) => s + r.weight_kg, 0)
    return (
      <Link href={`/driver/trips/${trip.id}`}>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 active:bg-gray-800 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-medium">{trip.destination}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(trip.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                {new Date(trip.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[trip.status]}`}>
              {trip.status.toLowerCase().replace('_', ' ')}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>{trip.requests.length} cargo</span>
            <span>{totalWeight.toFixed(0)} kg</span>
            {trip.vehicle && <span>{trip.vehicle.plate}</span>}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">My trips</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {todayTrips.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Today</p>
          <div className="space-y-3">
            {todayTrips.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </div>
      )}

      {upcomingTrips.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Upcoming</p>
          <div className="space-y-3">
            {upcomingTrips.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </div>
      )}

      {activeTrips.length === 0 && completedTrips.length === 0 && (
        <div className="text-center py-16 text-gray-600 text-sm">
          No trips assigned yet.
        </div>
      )}

      {completedTrips.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Completed & cancelled</p>
          <div className="space-y-3">
            {completedTrips.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}