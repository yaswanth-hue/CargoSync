import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// POST — driver's browser sends real GPS coords every 10s
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trip_id, lat, lng } = await request.json()
  if (!trip_id || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const log = await prisma.gpsLog.create({
    data: { trip_id, lat, lng },
  })

  return NextResponse.json(log, { status: 201 })
}

// GET — fetch GPS trail for a trip (used by dashboard map)
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const trip_id = searchParams.get('trip_id')
  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  const logs = await prisma.gpsLog.findMany({
    where: { trip_id },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json(logs)
}