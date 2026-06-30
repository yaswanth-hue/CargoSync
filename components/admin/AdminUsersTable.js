'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const roleColors = {
  ADMIN: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  COORDINATOR: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  DEPT_USER: 'text-gray-400 bg-gray-800 border-gray-700',
  DRIVER: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
}

export default function AdminUsersTable({ users, currentUserId }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [updating, setUpdating] = useState(null)

  async function updateRole(id, role) {
    setUpdating(id)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    setUpdating(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">User</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Department</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Requests</th>
            <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Role</th>
            <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Change role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-800/20 transition-colors">
              <td className="px-5 py-3.5">
                <p className="text-white font-medium">{u.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
              </td>
              <td className="px-5 py-3.5 text-gray-400 text-xs hidden md:table-cell">
                {u.department ?? <span className="text-gray-600 italic">—</span>}
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
                {u._count.requests}
              </td>
              <td className="px-5 py-3.5">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[u.role]}`}>
                  {u.role.toLowerCase().replace('_', ' ')}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                {u.id !== currentUserId ? (
                  <select
                    value={u.role}
                    disabled={updating === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="COORDINATOR">Coordinator</option>
                    <option value="DEPT_USER">Dept user</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                ) : (
                  <span className="text-xs text-gray-600 italic">You</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}