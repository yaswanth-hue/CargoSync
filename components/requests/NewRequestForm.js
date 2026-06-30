'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewRequestForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    destination: '',
    weight_kg: '',
    priority: 'MEDIUM',
    required_at: '',
  })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.destination || !form.required_at) {
      setError('Title, destination, and required date are required.')
      return
    }
    setError('')
    setLoading(true)

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/requests')
    router.refresh()
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
  const labelClass = "block text-xs text-gray-400 mb-1.5"

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={labelClass}>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Medical supplies to warehouse B"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            placeholder="Optional details about the cargo..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>Destination *</label>
          <input
            type="text"
            value={form.destination}
            onChange={set('destination')}
            placeholder="e.g. Warehouse B, Sector 4"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Weight (kg)</label>
          <input
            type="number"
            value={form.weight_kg}
            onChange={set('weight_kg')}
            placeholder="0"
            min="0"
            step="0.1"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Priority</label>
          <select value={form.priority} onChange={set('priority')} className={inputClass}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Required by *</label>
          <input
            type="datetime-local"
            value={form.required_at}
            onChange={set('required_at')}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit request'}
        </button>
        <button
          onClick={() => router.push('/requests')}
          className="text-gray-400 hover:text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}