import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewRequestForm from '@/components/requests/NewRequestForm'

export default async function NewRequestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <a href="/requests" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Back to requests
        </a>
        <h1 className="text-2xl font-semibold text-white mt-4">New request</h1>
        <p className="text-gray-500 text-sm mt-1">Submit a cargo transport request for coordinator approval</p>
      </div>
      <NewRequestForm />
    </div>
  )
}