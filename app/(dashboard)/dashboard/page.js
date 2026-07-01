import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import KpiCard from '@/components/dashboard/KpiCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import RealtimeKpis from '@/components/dashboard/RealtimeKpis'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    pendingCount,
    activeTrips,
    availableVehicles,
    inUseVehicles,
    recentRequests,
  ] = await Promise.all([
    prisma.request.count({ where: { status: 'PENDING' } }),
    prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.vehicle.count({ where: { status: 'IN_USE' } }),
    prisma.request.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        destination: true,
        status: true,
        priority: true,
        created_at: true,
        user: { select: { name: true, department: true } },
      },
    }),
  ])

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards — RealtimeKpis wraps these and live-updates counts */}
      <RealtimeKpis
        initialPending={pendingCount}
        initialActiveTrips={activeTrips}
        initialAvailableVehicles={availableVehicles}
        initialInUseVehicles={inUseVehicles}
      />

      {/* Recent activity feed */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Recent activity</h2>
          <a href="/requests" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">View all →</a>
        </div>
        <div className="px-5 py-2">
          <RecentActivity requests={recentRequests} />
        </div>
      </div>
    </div>
  )
}