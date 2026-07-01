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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deleting, setDeleting] = useState(null)

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

  function startEdit(v) {
    setEditingId(v.id)
    setEditForm({ name: v.name, plate: v.plate, capacity_kg: v.capacity_kg })
  }

  async function saveEdit(id) {
    setUpdating(id)
    await fetch('/api/vehicles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm, capacity_kg: parseFloat(editForm.capacity_kg) }),
    })
    setUpdating(null)
    setEditingId(null)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id) {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    setDeleting(id)
    await fetch('/api/vehicles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleting(null)
    startTransition(() => router.refresh())
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 text-center py-16 text-gray-600 text-sm">
        No vehicles in fleet yet. Add one above.
      </div>
    )
  }

  const inputClass = "bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500 w-full"

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      {/* Desktop table */}
      <table className="w-full text-sm hidden md:table">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Vehicle</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Plate</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Capacity</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
            {isAdmin && <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-gray-800/20 transition-colors">
              <td className="px-5 py-3.5">
                {editingId === v.id ? (
                  <input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                ) : (
                  <>
                    <p className="text-white font-medium">{v.name}</p>
                    {v.trips[0] && <p className="text-xs text-sky-400 mt-0.5">On trip · {v.trips[0].requests.length} cargo</p>}
                  </>
                )}
              </td>
              <td className="px-5 py-3.5">
                {editingId === v.id ? (
                  <input value={editForm.plate} onChange={(e) => setEditForm(f => ({ ...f, plate: e.target.value }))} className={`${inputClass} font-mono`} />
                ) : (
                  <span className="font-mono text-gray-400 text-xs">{v.plate}</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                {editingId === v.id ? (
                  <input type="number" value={editForm.capacity_kg} onChange={(e) => setEditForm(f => ({ ...f, capacity_kg: e.target.value }))} className={inputClass} />
                ) : (
                  <span className="text-gray-400 text-xs">{v.capacity_kg} kg</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                {isAdmin && editingId !== v.id ? (
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
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[v.status]}`}>
                    {v.status.toLowerCase().replace('_', ' ')}
                  </span>
                )}
              </td>
              {isAdmin && (
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === v.id ? (
                      <>
                        <button onClick={() => saveEdit(v.id)} disabled={updating === v.id} className="text-xs text-green-400 hover:text-green-300 border border-green-400/20 px-2.5 py-1 rounded-md transition-colors disabled:opacity-40">
                          {updating === v.id ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2.5 py-1 rounded-md transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(v)} className="text-xs text-sky-400 hover:text-sky-300 border border-sky-400/20 px-2.5 py-1 rounded-md transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id || v.status === 'IN_USE'} className="text-xs text-rose-400 hover:text-rose-300 border border-rose-400/20 px-2.5 py-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          {deleting === v.id ? '...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-800">
        {vehicles.map((v) => (
          <div key={v.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-medium">{v.name}</p>
                <p className="font-mono text-gray-500 text-xs mt-0.5">{v.plate}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[v.status]}`}>
                {v.status.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{v.capacity_kg} kg capacity{v.trips[0] ? ' · On trip' : ''}</p>
            {isAdmin && (
              <div className="flex gap-2">
                <select
                  value={v.status}
                  onChange={(e) => updateStatus(v.id, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
                <button onClick={() => startEdit(v)} className="text-xs text-sky-400 border border-sky-400/20 px-3 py-1.5 rounded-md">Edit</button>
                <button onClick={() => handleDelete(v.id)} disabled={v.status === 'IN_USE'} className="text-xs text-rose-400 border border-rose-400/20 px-3 py-1.5 rounded-md disabled:opacity-30">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}