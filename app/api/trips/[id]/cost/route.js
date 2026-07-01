import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { calculateDistanceFromTrail, calculateTripCost } from '@/lib/engine/cost'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      gps_logs: { orderBy: { timestamp: 'asc' } },
    },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const distanceKm = calculateDistanceFromTrail(trip.gps_logs)
  const ratePerKm = trip.vehicle?.rate_per_km ?? 10
  const estimatedCost = calculateTripCost(distanceKm, ratePerKm)

  return NextResponse.json({
    distanceKm: +distanceKm.toFixed(2),
    ratePerKm,
    estimatedCost,
    gpsPointCount: trip.gps_logs.length,
  })
}