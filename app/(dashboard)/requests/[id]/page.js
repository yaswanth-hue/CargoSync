import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canApproveRequests } from '@/lib/auth/rbac'
import RequestActions from '@/components/requests/RequestActions'

const statusColors = {
  PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  REJECTED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  CONSOLIDATED: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
}

const priorityColors = { LOW: 'text-gray-400', MEDIUM: 'text-amber-400', HIGH: 'text-rose-400' }

export default async function RequestDetailPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const [req, dbUser] = await Promise.all([
    prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, department: true, role: true } },
        trip: { include: { vehicle: true, waypoints: { orderBy: { order: 'asc' } } } },
      },
    }),
    prisma.user.findUnique({ where: { email: user.email } }),
  ])

  if (!req) notFound()

  const canApprove = canApproveRequests(dbUser?.role) && req.status === 'PENDING'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <a href="/requests" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Back to requests
        </a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{req.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Submitted by {req.user.name} on{' '}
            {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColors[req.status]}`}>
          {req.status.toLowerCase()}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Destination', value: req.destination },
          { label: 'Priority', value: req.priority, className: priorityColors[req.priority] },
          { label: 'Weight', value: `${req.weight_kg} kg` },
          { label: 'Required by', value: new Date(req.required_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Department', value: req.user.department ?? '—' },
          { label: 'Requester role', value: req.user.role?.toLowerCase() },
        ].map(({ label, value, className }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-medium text-white ${className ?? ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {req.description && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2">Description</p>
          <p className="text-sm text-gray-300">{req.description}</p>
        </div>
      )}

      {/* Trip info */}
      {req.trip && (
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-sky-400 mb-2 font-medium">Assigned to trip</p>
          <p className="text-sm text-white">{req.trip.destination}</p>
          {req.trip.vehicle && (
            <p className="text-xs text-gray-500 mt-1">
              Vehicle: {req.trip.vehicle.name} · {req.trip.vehicle.plate}
            </p>
          )}
          <a href={`/trips/${req.trip.id}`} className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
            View trip →
          </a>
        </div>
      )}

      {/* Actions */}
      {canApprove && <RequestActions requestId={req.id} />}
    </div>
  )
}