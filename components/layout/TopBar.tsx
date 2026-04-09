'use client'

import { useMemo } from 'react'

export default function TopBar() {
  const greeting = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    let greetingText = 'Good morning'
    if (hour >= 12 && hour < 17) {
      greetingText = 'Good afternoon'
    } else if (hour >= 17) {
      greetingText = 'Good evening'
    }
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    return {
      text: `${greetingText}, Jarrett`,
      date: dateFormatter.format(now),
    }
  }, [])

  return (
    <div className="h-12 bg-[#0D1117] px-4 flex items-center justify-between sticky top-0 z-30 border-b border-[#161B22]">
      <div className="flex flex-col">
        <h1 className="text-sm font-medium text-white">{greeting.text}</h1>
        <p className="text-xs text-[#8B949E]">{greeting.date}</p>
      </div>
    </div>
  )
}
