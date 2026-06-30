import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json()
  const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const trip = await prisma.trip.update({
    where: { id: params.id },
    data: { status },
  })

  // Free vehicle when trip completes or cancels
  if ((status === 'COMPLETED' || status === 'CANCELLED') && trip.vehicle_id) {
    await prisma.vehicle.update({
      where: { id: trip.vehicle_id },
      data: { status: 'AVAILABLE' },
    })
  }

  return NextResponse.json(trip)
}