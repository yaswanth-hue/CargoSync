'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const statusColors = {
  PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  REJECTED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  CONSOLIDATED: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
}

const priorityDot = { LOW: 'bg-gray-600', MEDIUM: 'bg-amber-400', HIGH: 'bg-rose-400' }

export default function RecentActivity({ requests: initialRequests }) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      const { data } = await supabase
        .from('Request')
        .select('id, title, destination, status, priority, created_at, user:user_id(name, department)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setRequests(data)
    }

    const sub = supabase
      .channel('realtime-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Request' }, refresh)
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  if (!requests?.length) {
    return (
      <div className="text-center py-12 text-gray-600 text-sm">
        No requests yet. <a href="/requests/new" className="text-sky-400 hover:text-sky-300">Create one →</a>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-800">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-gray-800/20 rounded-lg transition-colors -mx-1 px-2"
          onClick={() => router.push(`/requests/${req.id}`)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[req.priority] ?? 'bg-gray-600'}`} />
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{req.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {req.destination}
                {req.user?.name && <span className="text-gray-600"> · {req.user.name}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[req.status] ?? 'text-gray-400 bg-gray-800'}`}>
              {req.status.toLowerCase()}
            </span>
            <span className="text-xs text-gray-600 hidden sm:block">
              {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}