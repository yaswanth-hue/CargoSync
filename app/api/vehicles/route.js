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
    include: { trips: { where: { status: 'IN_PROGRESS' }, take: 1 } },
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

  const { name, plate, capacity_kg } = await request.json()
  if (!name || !plate || !capacity_kg) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const vehicle = await prisma.vehicle.create({
    data: { name, plate, capacity_kg: parseFloat(capacity_kg) },
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

  const { id, status } = await request.json()
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json(vehicle)
}