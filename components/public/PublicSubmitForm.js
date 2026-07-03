'use client'
import { useState } from 'react'

export default function PublicSubmitForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    title: '',
    description: '',
    pickup_location: '',
    destination: '',
    weight_kg: '',
    priority: 'MEDIUM',
    required_at: '',
  })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.contact_name || !form.contact_email || !form.title || !form.pickup_location || !form.destination || !form.required_at) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setLoading(true)

    const res = await fetch('/api/public/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-green-400 text-xl">✓</span>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Request submitted</h2>
        <p className="text-gray-500 text-sm mb-1">
          Thank you, <span className="text-white">{form.contact_name}</span>.
        </p>
        <p className="text-gray-500 text-sm">
          Our team will review your request and contact you at{' '}
          <span className="text-white">{form.contact_email}</span>.
        </p>
        <button
          onClick={() => {
            setSubmitted(false)
            setForm({ contact_name: '', contact_email: '', contact_phone: '', title: '', description: '', pickup_location: '', destination: '', weight_kg: '', priority: 'MEDIUM', required_at: '' })
          }}
          className="mt-6 text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          Submit another request →
        </button>
      </div>
    )
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
  const labelClass = "block text-xs text-gray-400 mb-1.5"

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
      {/* Contact info */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Your details</p>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full name *</label>
            <input type="text" value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="jane@company.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+91 98765 43210" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Cargo info */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Cargo details</p>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>What are you shipping? *</label>
            <input type="text" value={form.title} onChange={set('title')} placeholder="e.g. Medical supplies, Raw materials" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Any additional details about the cargo..." rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Pickup location *</label>
              <input type="text" value={form.pickup_location} onChange={set('pickup_location')} placeholder="Factory Gate 2, Patancheru" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Destination *</label>
              <input type="text" value={form.destination} onChange={set('destination')} placeholder="Warehouse B, Kompally" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Weight (kg)</label>
              <input type="number" value={form.weight_kg} onChange={set('weight_kg')} placeholder="0" min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={form.priority} onChange={set('priority')} className={inputClass}>
                <option value="LOW">Low — flexible timeline</option>
                <option value="MEDIUM">Medium — within a few days</option>
                <option value="HIGH">High — urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Required by *</label>
            <input type="datetime-local" value={form.required_at} onChange={set('required_at')} className={inputClass} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-lg transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit shipment request'}
      </button>

      <p className="text-xs text-gray-600 text-center">
        We typically respond within 24 hours on business days.
      </p>
    </div>
  )
}