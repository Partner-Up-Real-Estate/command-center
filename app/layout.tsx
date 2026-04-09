import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Command Center — Whiteridge',
  description: 'Daily OS for execution — Jarrett',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0D1117" />
      </head>
      <body className={`${inter.className} bg-[#0D1117] text-white antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
