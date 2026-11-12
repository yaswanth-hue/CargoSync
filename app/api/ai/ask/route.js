import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canUseAiAssistant } from '@/lib/auth/rbac'
import { NextResponse } from 'next/server'

// The AI service can take a while (Gemini calls + Render cold start).
export const maxDuration = 60

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
  if (!dbUser || !canUseAiAssistant(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baseUrl = process.env.AI_SERVICE_URL
  const apiKey = process.env.AI_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'AI service is not configured' }, { status: 503 })
  }

  const { question, trip_id } = await request.json()
  if (typeof question !== 'string' || question.trim().length < 3 || question.length > 500) {
    return NextResponse.json({ error: 'Question must be 3-500 characters' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55_000)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-User-Role': dbUser.role,
      },
      body: JSON.stringify({ question: question.trim(), trip_id: trip_id ?? null }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || 'AI service error' },
        { status: res.status === 429 ? 429 : 502 }
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'The AI service took too long to respond. It may be waking up — try again in a moment.' },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: 'Could not reach the AI service' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}