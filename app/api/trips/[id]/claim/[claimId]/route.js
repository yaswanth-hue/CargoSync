import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// PATCH — coordinator manually approves or rejects a pending claim
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!['ADMIN', 'COORDINATOR'].includes(dbUser?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { claimId } = await params
  const { action, verdict } = await request.json()

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const claim = await prisma.claim.findUnique({ where: { id: claimId } })
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  if (claim.status !== 'PENDING') {
    return NextResponse.json({ error: 'Claim is already resolved' }, { status: 400 })
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      verdict: verdict || (action === 'approve'
        ? 'Manually approved by coordinator'
        : 'Manually rejected by coordinator'),
    },
  })

  return NextResponse.json(updated)
}