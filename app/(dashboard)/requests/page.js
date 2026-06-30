import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canApproveRequests } from '@/lib/auth/rbac'
import RequestsTable from '@/components/requests/RequestsTable'

export default async function RequestsPage({ searchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  const canApprove = canApproveRequests(dbUser?.role)

  const statusFilter = (await searchParams)?.status
  const where = {}
  if (dbUser?.role === 'DEPT_USER') where.user_id = dbUser.id
  if (statusFilter && statusFilter !== 'ALL') where.status = statusFilter

  const requests = await prisma.request.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { user: { select: { name: true, department: true } } },
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Requests</h1>
          <p className="text-gray-500 text-sm mt-1">{requests.length} total</p>
        </div>
        {dbUser?.role !== 'DRIVER' && (
          <a
            href="/requests/new"
            className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New request
          </a>
        )}
      </div>
      <RequestsTable requests={requests} canApprove={canApprove} currentStatus={statusFilter ?? 'ALL'} />
    </div>
  )
}