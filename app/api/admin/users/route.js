import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['ADMIN', 'COORDINATOR', 'DEPT_USER', 'DRIVER']

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, role } = await request.json()

  if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Prevent admin from demoting themselves
  if (id === dbUser.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } })
  return NextResponse.json(updated)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, password, role, department } = await request.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name and password are required' }, { status: 400 })
  }

  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Password minimum length
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Check if user already exists in our DB
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      role: role ?? 'DEPT_USER',
      department: department ?? null,
    },
  })

  return NextResponse.json(newUser, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      created_at: true,
    },
  })

  return NextResponse.json(users)
}