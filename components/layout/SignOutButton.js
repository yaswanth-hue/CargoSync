'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton({ className }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className={className || 'text-xs text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 px-2.5 py-1 rounded-md border border-gray-800 hover:border-rose-400/30 transition-colors'}
    >
      Sign out
    </button>
  )
}