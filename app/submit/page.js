import Link from 'next/link'
import PublicSubmitForm from '@/components/public/PublicSubmitForm'

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="text-white font-semibold text-2xl tracking-tight">
          Cargo<span className="text-sky-400">Sync</span>
        </span>
        <h1 className="text-xl font-semibold text-white mt-4">Request a shipment</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-sm">
          Fill in your details and cargo info. Our team will review your request and get back to you.
        </p>
      </div>

      <div className="w-full max-w-lg">
        <PublicSubmitForm />
      </div>

      <p className="text-gray-600 text-xs mt-8">
        Employee?{' '}
        <Link href="/login" className="text-sky-400 hover:text-sky-300 transition-colors">
          Sign in to your account →
        </Link>
      </p>
    </div>
  )
}