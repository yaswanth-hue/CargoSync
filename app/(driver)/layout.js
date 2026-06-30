import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function DriverLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || dbUser.role !== 'DRIVER') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile-first sticky header */}
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-semibold tracking-tight">
          Cargo<span className="text-sky-400">Sync</span>
          <span className="text-gray-600 text-xs font-normal ml-2">Driver</span>
        </span>
        <div className="text-right">
          <p className="text-xs text-white">{dbUser.name}</p>
          <p className="text-xs text-gray-500">Driver</p>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
    </div>
  )
}