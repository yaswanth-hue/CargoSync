import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canUseAiAssistant } from '@/lib/auth/rbac'
import AssistantChat from '@/components/ai/AssistantChat'

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!canUseAiAssistant(dbUser?.role)) redirect('/dashboard')

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ask about requests, trips, vehicles and claims. The assistant is advisory only — it never
          changes data or overrides the allocation and validation rules.
        </p>
      </div>
      <AssistantChat />
    </div>
  )
}