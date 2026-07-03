import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import TripStatusUpdater from '@/components/trips/TripStatusUpdater'

export default async function UpdateTripStatusPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, destination: true, status: true },
  })

  if (!trip) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/driver/trips/${id}`} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Back to trip
        </Link>
        <h1 className="text-xl font-semibold text-white mt-4">Update status</h1>
        <p className="text-gray-500 text-sm mt-1">{trip.destination}</p>
      </div>
      <TripStatusUpdater trip={trip} />
    </div>
  )
}