'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦', roles: ['ADMIN', 'COORDINATOR', 'DEPT_USER'] },
  { href: '/requests', label: 'Requests', icon: '◧', roles: ['ADMIN', 'COORDINATOR', 'DEPT_USER'] },
  { href: '/trips', label: 'Trips', icon: '◈', roles: ['ADMIN', 'COORDINATOR'] },
  { href: '/vehicles', label: 'Vehicles', icon: '⬡', roles: ['ADMIN', 'COORDINATOR'] },
  { href: '/admin', label: 'Admin', icon: '◎', roles: ['ADMIN'] },
]

export default function Sidebar({ user }) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = allNavItems.filter((item) => item.roles.includes(user?.role))

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-full w-full bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800 flex-shrink-0">
        <span className="text-white font-semibold text-lg tracking-tight">
          Cargo<span className="text-sky-400">Sync</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1 flex-shrink-0">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-sky-500/10 text-sky-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info — always at bottom */}
      <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-medium flex-shrink-0">
            {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">{user?.name ?? user?.email ?? 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ') ?? 'member'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-gray-600 hover:text-gray-400 px-1 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </div>
  )
}