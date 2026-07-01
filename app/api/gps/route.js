import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'DRIVER') {
    return NextResponse.json({ error: 'Only drivers can submit GPS data' }, { status: 403 })
  }

  const body = await request.json()
  const { trip_id, lat, lng } = body

  if (!trip_id || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 })
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({
    where: { id: trip_id },
    select: { driver_id: true, status: true },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.driver_id !== dbUser.id) {
    return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
  }
  if (trip.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Trip is not in progress' }, { status: 400 })
  }

  const log = await prisma.gpsLog.create({
    data: { trip_id, lat, lng },
  })

  return NextResponse.json(log, { status: 201 })
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!['ADMIN', 'COORDINATOR'].includes(dbUser?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const trip_id = searchParams.get('trip_id')
  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  const logs = await prisma.gpsLog.findMany({
    where: { trip_id },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json(logs)
}