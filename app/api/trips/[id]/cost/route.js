import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { calcDistanceKm, calcTripCost } from '@/lib/engine/cost'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [trip, gpsLogs] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true },
    }),
    prisma.gpsLog.findMany({
      where: { trip_id: id },
      orderBy: { timestamp: 'asc' },
    }),
  ])

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const distanceKm = calcDistanceKm(gpsLogs)
  const ratePerKm = trip.vehicle?.rate_per_km ?? 10
  const cost = calcTripCost(distanceKm, ratePerKm)

  return NextResponse.json({
    trip_id: id,
    distance_km: distanceKm,
    rate_per_km: ratePerKm,
    total_cost: cost,
    gps_points: gpsLogs.length,
    vehicle: trip.vehicle ? { name: trip.vehicle.name, plate: trip.vehicle.plate } : null,
  })
}