import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { name: true, role: true, email: true },
  })

  if (dbUser?.role === 'DRIVER') redirect('/driver/trips')

  return (
    <div className="flex bg-gray-950 min-h-screen">
      {/* Fixed sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-60 z-40">
        <Sidebar user={dbUser} />
      </aside>
      {/* Main content offset by sidebar width */}
      <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}