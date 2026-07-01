import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!['ADMIN', 'COORDINATOR'].includes(dbUser?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { driver_id: true, vehicle_id: true, dispatched_at: true },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.dispatched_at) return NextResponse.json({ error: 'Already dispatched' }, { status: 400 })
  if (!trip.driver_id) return NextResponse.json({ error: 'No driver assigned' }, { status: 400 })
  if (!trip.vehicle_id) return NextResponse.json({ error: 'No vehicle assigned' }, { status: 400 })

  const updated = await prisma.trip.update({
    where: { id },
    data: { dispatched_at: new Date() },
  })

  return NextResponse.json(updated)
}