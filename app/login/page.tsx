'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#1F2937"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#1F2937"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#1F2937"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#1F2937"/>
  </svg>
)

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen w-full bg-[#0D1117] relative overflow-hidden flex items-center justify-center animate-fade-in">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#378ADD]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-[#378ADD]/5 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full px-4">
        <div className="max-w-md w-full mx-auto bg-[#161B22] border border-[#30363D] rounded-xl p-10 shadow-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 bg-[#378ADD] rounded-lg font-bold text-white text-lg">
              W
            </div>
            <div>
              <div className="font-bold text-white text-lg">Whiteridge</div>
              <div className="text-slate-400 text-xs font-medium">Command Center</div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Good to have you back, Jarrett.
          </h1>

          {/* Subtext */}
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your daily operating system for Whiteridge + Broki. Sign in to continue.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                Sign-in failed. Only authorized accounts can access this dashboard.
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-[#0D1117] font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Email Note */}
          <p className="text-slate-500 text-sm text-center mt-6">
            Access restricted to jarrett@whiteridge.ca
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <p className="text-slate-600 text-xs">
          © 2024 Whiteridge · Broki
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
