import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role } = await request.json()
  const updated = await prisma.user.update({ where: { id }, data: { role } })

  return NextResponse.json(updated)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, password, role, department } = await request.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name and password are required' }, { status: 400 })
  }

  // Use service role key to create auth user (bypasses email confirmation)
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