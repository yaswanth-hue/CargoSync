import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'


export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get role from our DB
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { name: true, role: true, email: true },
  })

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar user={dbUser} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}