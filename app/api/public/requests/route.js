import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const body = await request.json()
  const {
    contact_name,
    contact_email,
    contact_phone,
    title,
    description,
    pickup_location,
    destination,
    weight_kg,
    priority,
    required_at,
  } = body

  if (!contact_name || !contact_email || !title || !destination || !required_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const newRequest = await prisma.request.create({
    data: {
      title,
      description,
      pickup_location: pickup_location || null,
      destination,
      weight_kg: parseFloat(weight_kg) || 0,
      priority: priority ?? 'MEDIUM',
      required_at: new Date(required_at),
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      is_external: true,
    },
  })

  return NextResponse.json({ success: true, id: newRequest.id }, { status: 201 })
}