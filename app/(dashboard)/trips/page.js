import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canApproveRequests, canViewTrips } from '@/lib/auth/rbac'
import TripsTable from '@/components/trips/TripsTable'
import ConsolidateButton from '@/components/trips/ConsolidateButton'

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!canViewTrips(dbUser?.role)) redirect('/dashboard')

  const canConsolidate = canApproveRequests(dbUser?.role)

  const [trips, pendingApproved] = await Promise.all([
    prisma.trip.findMany({
      orderBy: { scheduled_at: 'desc' },
      include: {
        vehicle: true,
        requests: { select: { id: true, title: true, weight_kg: true } },
        waypoints: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.request.count({ where: { status: 'APPROVED', trip_id: null } }),
  ])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Trips</h1>
          <p className="text-gray-500 text-sm mt-1">{trips.length} total</p>
        </div>
        {canConsolidate && (
          <ConsolidateButton pendingCount={pendingApproved} />
        )}
      </div>

      {pendingApproved > 0 && canConsolidate && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-400">
            {pendingApproved} approved request{pendingApproved > 1 ? 's' : ''} ready to consolidate into trips
          </p>
        </div>
      )}

      <TripsTable trips={trips} />
    </div>
  )
}