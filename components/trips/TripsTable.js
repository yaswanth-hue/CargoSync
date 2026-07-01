'use client'
import { useRouter } from 'next/navigation'

const statusColors = {
  PLANNED: 'text-gray-400 bg-gray-800 border-gray-700',
  IN_PROGRESS: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default function TripsTable({ trips }) {
  const router = useRouter()

  if (trips.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 text-center py-16 text-gray-600 text-sm">
        No trips yet. Approve requests and run consolidation to generate trips.
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Destination</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Scheduled</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Vehicle</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Requests</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => router.push(`/trips/${trip.id}`)}>
                <td className="px-5 py-3.5">
                  <p className="text-white font-medium">{trip.destination}</p>
                  {trip.waypoints.length > 0 && <p className="text-xs text-gray-600 mt-0.5">{trip.waypoints.length} waypoint{trip.waypoints.length !== 1 ? 's' : ''}</p>}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(trip.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {trip.vehicle ? <span>{trip.vehicle.name} · <span className="text-gray-600">{trip.vehicle.plate}</span></span> : <span className="text-gray-600 italic">Unassigned</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{trip.requests.length} request{trip.requests.length !== 1 ? 's' : ''}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[trip.status]}`}>
                    {trip.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {trips.map((trip) => (
          <div key={trip.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer active:bg-gray-800" onClick={() => router.push(`/trips/${trip.id}`)}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-white font-medium text-sm">{trip.destination}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ml-2 ${statusColors[trip.status]}`}>
                {trip.status.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>{new Date(trip.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span>{trip.requests.length} requests</span>
              {trip.vehicle ? <span>{trip.vehicle.name}</span> : <span className="text-gray-600 italic">No vehicle</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}