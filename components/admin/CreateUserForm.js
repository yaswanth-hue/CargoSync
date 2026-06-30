'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateUserForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'DEPT_USER', department: '' })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.email || !form.name || !form.password) {
      setError('Email, name and password are required.')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to create user')
      return
    }

    setSuccess(`User ${data.name} created successfully.`)
    setForm({ email: '', name: '', password: '', role: 'DEPT_USER', department: '' })
    startTransition(() => router.refresh())
  }

  const inputClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Name</label>
        <input type="text" value={form.name} onChange={set('name')} placeholder="Jane Smith" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Email</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Password</label>
        <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Role</label>
        <select value={form.role} onChange={set('role')} className={inputClass}>
          <option value="DEPT_USER">Dept user</option>
          <option value="COORDINATOR">Coordinator</option>
          <option value="DRIVER">Driver</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Department</label>
        <input type="text" value={form.department} onChange={set('department')} placeholder="Optional" className={inputClass} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Creating...' : 'Create user'}
      </button>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
      {success && <p className="w-full text-xs text-green-400">{success}</p>}
    </div>
  )
}