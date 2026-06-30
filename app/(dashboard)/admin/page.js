import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminUsersTable from '@/components/admin/AdminUsersTable'
import CreateUserForm from '@/components/admin/CreateUserForm'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (dbUser?.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' },
    include: { _count: { select: { requests: true } } },
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} users · Role management</p>
      </div>

      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Create user</h2>
        <CreateUserForm />
      </div>

      <AdminUsersTable users={users} currentUserId={dbUser.id} />
    </div>
  )
}