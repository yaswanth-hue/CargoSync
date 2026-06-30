import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
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

  const { id } = await params
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      waypoints: { orderBy: { order: 'asc' } },
      requests: {
        include: { user: { select: { name: true, department: true } } },
        orderBy: { priority: 'desc' },
      },
    },
  })

  if (!trip) notFound()

  const totalWeight = trip.requests.reduce((s, r) => s + r.weight_kg, 0)

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
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-sm font-medium text-white">Cargo manifest</p>
        </div>
        <div className="divide-y divide-gray-800">
          {trip.requests.map((req) => (
            <div key={req.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{req.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{req.user.name}{req.user.department ? ` · ${req.user.department}` : ''}</p>
              </div>
              <p className="text-xs text-gray-400 ml-4 shrink-0">{req.weight_kg} kg</p>
            </div>
          ))}
        </div>
      </div>

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