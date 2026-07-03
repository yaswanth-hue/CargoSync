import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { calculateDistanceFromTrail, validateDistanceClaim } from '@/lib/engine/cost'
import { NextResponse } from 'next/server'

// GET — list all claims for a trip
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { driver_id: true },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  // Drivers can only see claims for their own trips
  if (dbUser.role === 'DRIVER' && trip.driver_id !== dbUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const claims = await prisma.claim.findMany({
    where: { trip_id: id },
    include: {
      user: { select: { name: true, role: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(claims)
}

// POST — driver submits a claim
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'DRIVER') {
    return NextResponse.json({ error: 'Only drivers can submit claims' }, { status: 403 })
  }

  const { id } = await params
  const { type, claimed_km, claimed_minutes, reason } = await request.json()

  // Validate claim type
  if (!type || !['EXTRA_KM', 'WAITING_TIME'].includes(type)) {
    return NextResponse.json({ error: 'Invalid claim type' }, { status: 400 })
  }

  // Validate fields based on type
  if (type === 'EXTRA_KM') {
    if (claimed_km == null || typeof claimed_km !== 'number' || claimed_km <= 0) {
      return NextResponse.json({ error: 'claimed_km must be a positive number' }, { status: 400 })
    }
  }

  if (type === 'WAITING_TIME') {
    if (claimed_minutes == null || typeof claimed_minutes !== 'number' || claimed_minutes <= 0) {
      return NextResponse.json({ error: 'claimed_minutes must be a positive number' }, { status: 400 })
    }
  }

  // Verify trip ownership and completion
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      gps_logs: { orderBy: { timestamp: 'asc' } },
    },
  })

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.driver_id !== dbUser.id) {
    return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
  }
  if (trip.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Can only submit claims for completed trips' }, { status: 400 })
  }

  // Prevent duplicate claims of the same type
  const existing = await prisma.claim.findFirst({
    where: { trip_id: id, type, submitted_by: dbUser.id },
  })
  if (existing) {
    return NextResponse.json({ error: 'You already submitted this type of claim for this trip' }, { status: 400 })
  }

  // Auto-validate EXTRA_KM against GPS trail
  let status = 'PENDING'
  let verdict = null
  let actual_km = null

  if (type === 'EXTRA_KM') {
    if (trip.gps_logs.length >= 2) {
      const actualDistance = calculateDistanceFromTrail(trip.gps_logs)
      actual_km = actualDistance
      const validation = validateDistanceClaim(claimed_km, actualDistance)

      if (validation.valid) {
        status = 'APPROVED'
        verdict = `Auto-approved: claimed ${claimed_km} km, actual GPS distance ${actualDistance.toFixed(2)} km (within 10% tolerance)`
      } else {
        status = 'REJECTED'
        verdict = `Auto-rejected: claimed ${claimed_km} km exceeds actual GPS distance ${actualDistance.toFixed(2)} km by ${validation.excessKm} km`
      }
    } else {
      // No GPS data — goes to manual review
      verdict = 'No GPS data available — pending manual review by coordinator'
    }
  }

  // WAITING_TIME always goes to manual review
  if (type === 'WAITING_TIME') {
    verdict = 'Pending manual review by coordinator'
  }

  const claim = await prisma.claim.create({
    data: {
      trip_id: id,
      submitted_by: dbUser.id,
      type,
      claimed_km: claimed_km ?? null,
      claimed_minutes: claimed_minutes ?? null,
      reason: reason ?? null,
      status,
      verdict,
      actual_km,
    },
  })

  return NextResponse.json(claim, { status: 201 })
}