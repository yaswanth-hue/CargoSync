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
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Destination</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Scheduled</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Vehicle</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Requests</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {trips.map((trip) => (
            <tr
              key={trip.id}
              className="hover:bg-gray-800/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/trips/${trip.id}`)}
            >
              <td className="px-5 py-3.5">
                <p className="text-white font-medium">{trip.destination}</p>
                {trip.waypoints.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {trip.waypoints.length} waypoint{trip.waypoints.length !== 1 ? 's' : ''}
                  </p>
                )}
              </td>
              <td className="px-5 py-3.5 text-gray-400 text-xs hidden md:table-cell">
                {new Date(trip.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-5 py-3.5 text-gray-400 text-xs">
                {trip.vehicle ? (
                  <span>{trip.vehicle.name} · <span className="text-gray-600">{trip.vehicle.plate}</span></span>
                ) : (
                  <span className="text-gray-600 italic">Unassigned</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
                {trip.requests.length} request{trip.requests.length !== 1 ? 's' : ''}
              </td>
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
  )
}