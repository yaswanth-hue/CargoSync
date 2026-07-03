import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
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
        <Link href="/requests" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Back to requests
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-white">{req.title}</h1>
            {req.is_external && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-purple-400 bg-purple-400/10 border-purple-400/20">
                External
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Submitted on{' '}
            {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColors[req.status]}`}>
          {req.status.toLowerCase()}
        </span>
      </div>

      {/* External contact info */}
      {req.is_external && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-purple-400 font-medium mb-3">External submitter</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Name</p>
              <p className="text-white">{req.contact_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <a href={`mailto:${req.contact_email}`} className="text-sky-400 hover:text-sky-300 transition-colors">
                {req.contact_email ?? '—'}
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              {req.contact_phone ? (
                <a href={`tel:${req.contact_phone}`} className="text-sky-400 hover:text-sky-300 transition-colors">
                  {req.contact_phone}
                </a>
              ) : (
                <p className="text-gray-600 italic">Not provided</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route — pickup to destination */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 mb-3">Route</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Pickup</p>
            <p className="text-sm text-white">{req.pickup_location ?? <span className="text-gray-600 italic">Not specified</span>}</p>
          </div>
          <div className="text-gray-600 text-lg">→</div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Destination</p>
            <p className="text-sm text-white">{req.destination}</p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Priority', value: req.priority, className: priorityColors[req.priority] },
          { label: 'Weight', value: `${req.weight_kg} kg` },
          { label: 'Required by', value: new Date(req.required_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Submitted by', value: req.is_external ? req.contact_name : (req.user?.name ?? '—') },
          { label: 'Department', value: req.user?.department ?? (req.is_external ? 'External' : '—') },
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
          <Link href={`/trips/${req.trip.id}`} className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
            View trip →
          </Link>
        </div>
      )}

      {canApprove && <RequestActions requestId={req.id} />}
    </div>
  )
}