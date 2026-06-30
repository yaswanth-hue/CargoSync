'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const statusColors = {
  AVAILABLE: 'text-green-400 bg-green-400/10 border-green-400/20',
  IN_USE: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  MAINTENANCE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export default function VehiclesTable({ vehicles, isAdmin }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [updating, setUpdating] = useState(null)

  async function updateStatus(id, status) {
    setUpdating(id)
    await fetch('/api/vehicles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setUpdating(null)
    startTransition(() => router.refresh())
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 text-center py-16 text-gray-600 text-sm">
        No vehicles in fleet yet. Add one above.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Vehicle</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Plate</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Capacity</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
            {isAdmin && <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-gray-800/20 transition-colors">
              <td className="px-5 py-3.5">
                <p className="text-white font-medium">{v.name}</p>
                {v.trips[0] && (
                  <p className="text-xs text-sky-400 mt-0.5">
                    On trip · {v.trips[0].requests.length} cargo{v.trips[0].requests.length !== 1 ? 's' : ''}
                  </p>
                )}
              </td>
              <td className="px-5 py-3.5 font-mono text-gray-400 text-xs">{v.plate}</td>
              <td className="px-5 py-3.5 text-gray-400 text-xs hidden md:table-cell">{v.capacity_kg} kg</td>
              <td className="px-5 py-3.5">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[v.status]}`}>
                  {v.status.toLowerCase().replace('_', ' ')}
                </span>
              </td>
              {isAdmin && (
                <td className="px-5 py-3.5 text-right">
                  <select
                    value={v.status}
                    disabled={updating === v.id}
                    onChange={(e) => updateStatus(v.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_USE">In use</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}