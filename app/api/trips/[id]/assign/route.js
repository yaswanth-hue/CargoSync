import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!['ADMIN', 'COORDINATOR'].includes(dbUser?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { driver_id, rate_per_km } = await request.json()

  const updates = {}
  if (driver_id !== undefined) updates.driver_id = driver_id || null
  if (rate_per_km !== undefined) {
    await prisma.vehicle.updateMany({
      where: { trips: { some: { id } } },
      data: { rate_per_km: parseFloat(rate_per_km) },
    })
  }

  const trip = await prisma.trip.update({
    where: { id },
    data: updates,
    include: { driver: { select: { id: true, name: true } } },
  })

  return NextResponse.json(trip)
}