'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function AddVehicleForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', plate: '', capacity_kg: '' })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.name || !form.plate || !form.capacity_kg) {
      setError('All fields required.')
      return
    }
    setError('')
    setLoading(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to add vehicle')
      setLoading(false)
      return
    }
    setForm({ name: '', plate: '', capacity_kg: '' })
    setLoading(false)
    startTransition(() => router.refresh())
  }

  const inputClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Name</label>
        <input type="text" value={form.name} onChange={set('name')} placeholder="Truck A" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Plate</label>
        <input type="text" value={form.plate} onChange={set('plate')} placeholder="TS09AB1234" className={`${inputClass} font-mono`} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Capacity (kg)</label>
        <input type="number" value={form.capacity_kg} onChange={set('capacity_kg')} placeholder="1000" className={inputClass} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Adding...' : 'Add vehicle'}
      </button>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </div>
  )
}