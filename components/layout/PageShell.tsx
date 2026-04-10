'use client'

import { useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import CommandBar from '@/components/dashboard/CommandBar'
import type { CommandAction } from '@/types'

interface PageShellProps {
  children: React.ReactNode
  selectedDate?: Date
  onCommandAction?: (action: CommandAction) => void
  pageContext?: string
}

export default function PageShell({ children, selectedDate, onCommandAction, pageContext }: PageShellProps) {
  const [mobileAIOpen, setMobileAIOpen] = useState(false)

  const handleAction = useCallback((action: CommandAction) => {
    if (onCommandAction) onCommandAction(action)
  }, [onCommandAction])

  return (
    <div className="app-shell flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Command Bar — desktop always visible, mobile toggle via bottom nav */}
        <div className={`border-b border-[#161B22] ${mobileAIOpen ? 'block' : 'hidden md:block'}`}>
          <div className="px-3 py-2">
            <CommandBar
              selectedDate={selectedDate || new Date()}
              onAction={handleAction}
              pageContext={pageContext}
            />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto smooth-scroll pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav onAIToggle={() => setMobileAIOpen(prev => !prev)} aiOpen={mobileAIOpen} />
    </div>
  )
}
