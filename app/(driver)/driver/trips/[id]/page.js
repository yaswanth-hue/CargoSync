import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateDistanceFromTrail, calculateTripCost } from '@/lib/engine/cost'
import ClaimSubmitForm from '@/components/trips/ClaimSubmitForm'
import Link from 'next/link'

const statusColors = {
  PLANNED: 'text-gray-400 bg-gray-800 border-gray-700',
  IN_PROGRESS: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default async function DriverTripDetailPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })

  const { id } = await params
  const [trip, gpsLogs, existingClaims] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        waypoints: { orderBy: { order: 'asc' } },
        requests: {
          include: { user: { select: { name: true, department: true } } },
          orderBy: { priority: 'desc' },
        },
      },
    }),
    prisma.gpsLog.findMany({
      where: { trip_id: id },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.claim.findMany({
      where: { trip_id: id, submitted_by: dbUser?.id },
      select: { type: true, status: true, verdict: true, claimed_km: true, actual_km: true, claimed_minutes: true },
    }),
  ])

  if (!trip) notFound()

  const totalWeight = trip.requests.reduce((s, r) => s + r.weight_kg, 0)
  const distanceKm = calculateDistanceFromTrail(gpsLogs)
  const ratePerKm = trip.vehicle?.rate_per_km ?? 10
  const earnings = calculateTripCost(distanceKm, ratePerKm)
  const hasGpsData = gpsLogs.length >= 2

  return (
    <div>
      <div className="mb-5">
        <Link href="/driver/trips" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← All trips
        </Link>
      </div>

      {/* Trip header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-lg font-semibold text-white">{trip.destination}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[trip.status]}`}>
            {trip.status.toLowerCase().replace('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Scheduled</p>
            <p className="text-white">
              {new Date(trip.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
              {new Date(trip.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total cargo</p>
            <p className="text-white">{totalWeight.toFixed(1)} kg · {trip.requests.length} items</p>
          </div>
        </div>
      </div>

      {/* Earnings panel */}
      <div className={`rounded-xl p-4 mb-4 border ${
        trip.status === 'COMPLETED'
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-gray-900 border-gray-800'
      }`}>
        <p className="text-xs text-gray-500 mb-3">
          {trip.status === 'COMPLETED' ? 'Trip earnings' : 'Estimated earnings'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            {hasGpsData ? (
              <>
                <p className="text-2xl font-semibold text-white">
                  ₹{earnings.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {distanceKm} km × ₹{ratePerKm}/km
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold text-gray-600">—</p>
                <p className="text-xs text-gray-600 mt-1">
                  {trip.status === 'PLANNED'
                    ? 'Available once trip starts'
                    : 'No GPS data recorded'}
                </p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Rate</p>
            <p className="text-sm text-white">₹{ratePerKm}/km</p>
            {hasGpsData && (
              <>
                <p className="text-xs text-gray-500 mt-1">GPS points</p>
                <p className="text-sm text-white">{gpsLogs.length}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle info */}
      {trip.vehicle && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2">Your vehicle</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{trip.vehicle.name}</p>
              <p className="font-mono text-gray-400 text-xs mt-0.5">{trip.vehicle.plate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Capacity</p>
              <p className="text-sm text-white">{trip.vehicle.capacity_kg} kg</p>
            </div>
          </div>
        </div>
      )}

      {/* Waypoints */}
      {trip.waypoints.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3">Route</p>
          <ol className="space-y-2">
            {trip.waypoints.map((wp, i) => (
              <li key={wp.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-300">{wp.label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Cargo list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-sm font-medium text-white">Cargo manifest</p>
        </div>
        <div className="divide-y divide-gray-800">
          {trip.requests.map((req) => (
            <div key={req.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{req.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {req.user?.name}{req.user?.department ? ` · ${req.user.department}` : ''}
                </p>
              </div>
              <p className="text-xs text-gray-400 ml-4 shrink-0">{req.weight_kg} kg</p>
            </div>
          ))}
        </div>
      </div>

      {/* Claims section — only for completed trips */}
      {trip.status === 'COMPLETED' && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Claims</p>

          {/* Show existing claims status */}
          {existingClaims.length > 0 && (
            <div className="space-y-2 mb-4">
              {existingClaims.map((claim, i) => (
                <div key={i} className={`rounded-lg px-3 py-2.5 border text-xs ${
                  claim.status === 'APPROVED'
                    ? 'bg-green-500/5 border-green-500/20'
                    : claim.status === 'REJECTED'
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">
                      {claim.type === 'EXTRA_KM' ? 'Extra distance claim' : 'Waiting time claim'}
                    </span>
                    <span className={
                      claim.status === 'APPROVED' ? 'text-green-400'
                      : claim.status === 'REJECTED' ? 'text-rose-400'
                      : 'text-amber-400'
                    }>
                      {claim.status === 'APPROVED' ? '✓ Approved' : claim.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                  {claim.verdict && <p className="text-gray-400">{claim.verdict}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Claim submit form */}
          <ClaimSubmitForm tripId={trip.id} existingClaims={existingClaims} />
        </div>
      )}

      {/* Update status button */}
      {(trip.status === 'PLANNED' || trip.status === 'IN_PROGRESS') && (
        <Link
          href={`/driver/trips/${trip.id}/update`}
          className="block w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-medium py-3 rounded-xl text-center transition-colors"
        >
          Update trip status
        </Link>
      )}
    </div>
  )
}