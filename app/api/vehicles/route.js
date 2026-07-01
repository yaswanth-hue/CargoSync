import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canManageVehicles } from '@/lib/auth/rbac'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { created_at: 'desc' },
    include: { trips: { where: { status: 'IN_PROGRESS' }, take: 1, include: { requests: { select: { id: true } } } } },
  })

  return NextResponse.json(vehicles)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canManageVehicles(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, plate, capacity_kg, rate_per_km } = await request.json()
  if (!name || !plate || !capacity_kg) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const vehicle = await prisma.vehicle.create({
    data: { name, plate, capacity_kg: parseFloat(capacity_kg), rate_per_km: parseFloat(rate_per_km ?? 10) },
  })

  return NextResponse.json(vehicle, { status: 201 })
}

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canManageVehicles(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status, name, plate, capacity_kg, rate_per_km } = await request.json()
  
  const data = {}
  if (status) data.status = status
  if (name) data.name = name
  if (plate) data.plate = plate
  if (capacity_kg != null) data.capacity_kg = parseFloat(capacity_kg)
  if (rate_per_km != null) data.rate_per_km = parseFloat(rate_per_km)

  const vehicle = await prisma.vehicle.update({ where: { id }, data })

  return NextResponse.json(vehicle)
}

export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canManageVehicles(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()

  // Don't allow deleting a vehicle currently in use
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })
  if (vehicle?.status === 'IN_USE') {
    return NextResponse.json({ error: 'Cannot delete a vehicle currently in use' }, { status: 400 })
  }

  await prisma.vehicle.delete({ where: { id } })

  return NextResponse.json({ success: true })
}