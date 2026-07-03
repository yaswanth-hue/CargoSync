import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateDistanceFromTrail, calculateTripCost } from '@/lib/engine/cost'
import TripAssignPanel from '@/components/trips/TripAssignPanel'
import TripMap from '@/components/trips/TripMap'
import ClaimsPanel from '@/components/trips/ClaimsPanel'

const statusColors = {
  PLANNED: 'text-gray-400 bg-gray-800 border-gray-700',
  IN_PROGRESS: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default async function TripDetailPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  const canAssign = ['ADMIN', 'COORDINATOR'].includes(dbUser?.role)

  const { id } = await params

  const [trip, gpsLogs, claims] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, email: true } },
        waypoints: { orderBy: { order: 'asc' } },
        requests: {
          include: { user: { select: { name: true, department: true } } },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.gpsLog.findMany({
      where: { trip_id: id },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.claim.findMany({
      where: { trip_id: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { created_at: 'desc' },
    }),
  ])

  if (!trip) notFound()

  const totalWeight = trip.requests.reduce((sum, r) => sum + r.weight_kg, 0)

  // Drivers already on another active trip (exclude current trip)
  const busyDriverIds = await prisma.trip.findMany({
    where: {
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      id: { not: id },
      driver_id: { not: null },
    },
    select: { driver_id: true },
  }).then((trips) => trips.map((t) => t.driver_id))

  const drivers = await prisma.user.findMany({
    where: {
      role: 'DRIVER',
      id: { notIn: busyDriverIds.length > 0 ? busyDriverIds : [''] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const distanceKm = calculateDistanceFromTrail(gpsLogs)
  const ratePerKm = trip.vehicle?.rate_per_km ?? 10
  const totalCost = calculateTripCost(distanceKm, ratePerKm)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <a href="/trips" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Back to trips
        </a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{trip.destination}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Scheduled for{' '}
            {new Date(trip.scheduled_at).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          {trip.driver && (
            <p className="text-xs text-sky-400 mt-1">Driver: {trip.driver.name}</p>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColors[trip.status]}`}>
          {trip.status.toLowerCase().replace('_', ' ')}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Requests', value: trip.requests.length },
          { label: 'Total weight', value: `${totalWeight.toFixed(1)} kg` },
          { label: 'Distance', value: distanceKm > 0 ? `${distanceKm} km` : '—' },
          { label: 'Est. cost', value: distanceKm > 0 ? `₹${totalCost}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xl font-semibold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Assignment panel — only for PLANNED trips */}
      {canAssign && trip.status === 'PLANNED' && (
        <TripAssignPanel
          trip={trip}
          drivers={drivers}
          totalWeight={totalWeight}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Vehicle */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Assigned vehicle</h2>
          {trip.vehicle ? (
            <div className="space-y-2">
              {[
                { label: 'Name', value: trip.vehicle.name },
                { label: 'Plate', value: trip.vehicle.plate, mono: true },
                { label: 'Capacity', value: `${trip.vehicle.capacity_kg} kg` },
                { label: 'Rate', value: `₹${trip.vehicle.rate_per_km}/km` },
                {
                  label: 'Load',
                  value: `${((totalWeight / trip.vehicle.capacity_kg) * 100).toFixed(0)}%`,
                  className: totalWeight / trip.vehicle.capacity_kg > 0.9
                    ? 'text-rose-400'
                    : 'text-green-400',
                },
              ].map(({ label, value, mono, className }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`${mono ? 'font-mono' : ''} ${className ?? 'text-white'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">No vehicle assigned</p>
          )}
        </div>

        {/* Waypoints */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Waypoints</h2>
          {trip.waypoints.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No waypoints</p>
          ) : (
            <ol className="space-y-2">
              {trip.waypoints.map((wp, i) => (
                <li key={wp.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-gray-300">{wp.label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* GPS Map */}
      <TripMap gpsLogs={gpsLogs} />

      {/* Cost breakdown */}
      {distanceKm > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-white mb-4">Cost breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Distance tracked</span>
              <span className="text-white">{distanceKm} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rate per km</span>
              <span className="text-white">₹{ratePerKm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">GPS data points</span>
              <span className="text-white">{gpsLogs.length}</span>
            </div>
            <div className="border-t border-gray-800 pt-2 mt-2 flex justify-between font-medium">
              <span className="text-gray-300">Total cost</span>
              <span className="text-white">₹{totalCost}</span>
            </div>
          </div>
        </div>
      )}

      {/* Claims panel — shows for all completed trips */}
      {trip.status === 'COMPLETED' && (
        <ClaimsPanel claims={claims} tripId={id} />
      )}

      {/* Requests table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-white">Cargo requests in this trip</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Request</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Requester</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {trip.requests.map((req) => (
              <tr key={req.id}>
                <td className="px-5 py-3">
                  <a href={`/requests/${req.id}`} className="text-white hover:text-sky-400 transition-colors">
                    {req.title}
                  </a>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">
                  {req.user?.name}
                  {req.user?.department && (
                    <span className="text-gray-600"> · {req.user.department}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs">
                  {req.weight_kg} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}