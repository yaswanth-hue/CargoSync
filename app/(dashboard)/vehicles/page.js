import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canManageVehicles, canViewVehicles } from '@/lib/auth/rbac'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import AddVehicleForm from '@/components/vehicles/AddVehicleForm'

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!canViewVehicles(dbUser?.role)) redirect('/dashboard')

  const isAdmin = canManageVehicles(dbUser?.role)

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { created_at: 'desc' },
    include: { trips: { where: { status: 'IN_PROGRESS' }, take: 1, include: { requests: { select: { id: true } } } } },
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vehicles</h1>
          <p className="text-gray-500 text-sm mt-1">{vehicles.length} in fleet</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Add vehicle</h2>
          <AddVehicleForm />
        </div>
      )}

      <VehiclesTable vehicles={vehicles} isAdmin={isAdmin} />
    </div>
  )
}