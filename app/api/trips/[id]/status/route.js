import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const { status } = await request.json()

  const validStatuses = ['PLANNED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { driver_id: true, dispatched_at: true, status: true, vehicle_id: true },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const isAssignedDriver = dbUser.role === 'DRIVER' && trip.driver_id === dbUser.id
  const isCoordinator = ['ADMIN', 'COORDINATOR'].includes(dbUser.role)

  if (!isAssignedDriver && !isCoordinator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (dbUser.role === 'DRIVER') {
    const driverAllowed = ['PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    if (!driverAllowed.includes(status)) {
      return NextResponse.json({ error: 'Drivers cannot set this status' }, { status: 403 })
    }
  }

  const updatedTrip = await prisma.trip.update({
    where: { id },
    data: { status },
  })

  // Free vehicle when trip completes or cancels
  if ((status === 'COMPLETED' || status === 'CANCELLED') && trip.vehicle_id) {
    await prisma.vehicle.update({
      where: { id: trip.vehicle_id },
      data: { status: 'AVAILABLE' },
    })
  }

  return NextResponse.json(updatedTrip)
}