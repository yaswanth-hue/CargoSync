import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canApproveRequests } from '@/lib/auth/rbac'
import { consolidateRequests } from '@/lib/engine/consolidate'
import { allocateVehicle } from '@/lib/engine/allocate'
import { orderWaypoints } from '@/lib/engine/route'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trips = await prisma.trip.findMany({
    orderBy: { scheduled_at: 'desc' },
    include: {
      vehicle: true,
      requests: { include: { user: { select: { name: true, department: true } } } },
      waypoints: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(trips)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canApproveRequests(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const approvedRequests = await prisma.request.findMany({
    where: { status: 'APPROVED', trip_id: null },
  })

  if (approvedRequests.length === 0) {
    return NextResponse.json({ message: 'No approved requests to consolidate', trips: [] })
  }

  const vehicles = await prisma.vehicle.findMany({ where: { status: 'AVAILABLE' } })
  const groups = consolidateRequests(approvedRequests)
  const createdTrips = []

  for (const group of groups) {
    // Fixed: allocateVehicle(vehicles, totalWeight)
    const vehicle = allocateVehicle(vehicles, group.total_weight_kg)
    // Fixed: orderWaypoints takes array of request objects, sorts by priority + required_at
    const orderedRequests = orderWaypoints(group.requests)

    const trip = await prisma.trip.create({
      data: {
        destination: group.destination,
        scheduled_at: new Date(group.required_at),
        vehicle_id: vehicle?.id ?? null,
        requests: { connect: group.requests.map((r) => ({ id: r.id })) },
        waypoints: {
          create: orderedRequests.map((r, i) => ({
            label: r.destination,
            order: i,
          })),
        },
      },
    })

    await prisma.request.updateMany({
      where: { id: { in: group.requests.map((r) => r.id) } },
      data: { status: 'CONSOLIDATED' },
    })

    if (vehicle) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'IN_USE' },
      })
      const idx = vehicles.findIndex((v) => v.id === vehicle.id)
      if (idx !== -1) vehicles.splice(idx, 1)
    }

    createdTrips.push(trip)
  }

  return NextResponse.json({ trips: createdTrips }, { status: 201 })
}