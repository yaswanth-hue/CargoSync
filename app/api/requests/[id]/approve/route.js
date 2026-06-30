import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canApproveRequests } from '@/lib/auth/rbac'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canApproveRequests(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action } = await request.json() // 'approve' | 'reject'
  const status = action === 'approve' ? 'APPROVED' : 'REJECTED'

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: { status },
  })

  return NextResponse.json(updated)
}