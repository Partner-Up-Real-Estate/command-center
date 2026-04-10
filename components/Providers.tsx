'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Attempt to lock screen orientation to portrait when in PWA/standalone
    // This is a best-effort — many browsers require fullscreen to honor it,
    // and iOS Safari ignores it entirely (manifest + CSS handle iOS).
    try {
      const anyScreen = screen as any
      if (anyScreen?.orientation?.lock) {
        anyScreen.orientation.lock('portrait').catch(() => {
          /* silently ignore: not supported or not allowed */
        })
      }
    } catch {
      /* ignore */
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
