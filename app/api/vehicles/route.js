import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const where = {}
  // Dept users only see their own requests
  if (dbUser.role === 'DEPT_USER') where.user_id = dbUser.id
  if (status && status !== 'ALL') where.status = status

  const requests = await prisma.request.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { user: { select: { name: true, department: true } } },
  })

  return NextResponse.json(requests)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Drivers cannot create requests
  if (dbUser.role === 'DRIVER') {
    return NextResponse.json({ error: 'Forbidden — drivers cannot create requests' }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, pickup_location, destination, weight_kg, priority, required_at } = body

  if (!title || !destination || !required_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const newRequest = await prisma.request.create({
    data: {
      title,
      description,
      pickup_location: pickup_location || null,
      destination,
      weight_kg: parseFloat(weight_kg) || 0,
      priority: priority || 'MEDIUM',
      required_at: new Date(required_at),
      user_id: dbUser.id,
    },
  })

  return NextResponse.json(newRequest, { status: 201 })
}