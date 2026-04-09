'use client'

import { useEffect, useState } from 'react'
import { DAILY_BLOCKS, CATEGORY_COLORS } from '@/lib/blocks'
import { getDayState } from '@/lib/storage'
import Badge from '@/components/ui/Badge'

interface BlockTimelineProps {
  selectedDate: Date
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [time, period] = timeStr.split(' ')
  let [hours, minutes] = time.split(':').map(Number)
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return { hours, minutes: minutes || 0 }
}

function isCurrentBlock(startTime: string, endTime: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const startMinutes = start.hours * 60 + start.minutes
  const endMinutes = end.hours * 60 + end.minutes
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export default function BlockTimeline({ selectedDate, selectedBlockId, onSelectBlock }: BlockTimelineProps) {
  const [now, setNow] = useState(new Date())
  const [dayState, setDayState] = useState(() => getDayState(selectedDate))

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setDayState(getDayState(selectedDate))
  }, [selectedDate])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">My Daily OS</h3>
        <span className="text-xs text-slate-400">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="divide-y divide-[#30363D]">
        {DAILY_BLOCKS.map((block) => {
          const isSelected = selectedBlockId === block.id
          const isLive = isToday && isCurrentBlock(block.startTime, block.endTime)
          const completedCount = block.tasks.filter((_, i) =>
            dayState.checklist[`${block.id}_${i}`]
          ).length
          const color = CATEGORY_COLORS[block.category]

          return (
            <button
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={`w-full text-left flex items-stretch transition-colors ${
                isSelected ? 'bg-[#1C2333]' : 'hover:bg-[#1C2333]'
              }`}
            >
              {/* Color bar */}
              <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />

              <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                      {block.startTime}–{block.endTime}
                    </span>
                    {isLive && (
                      <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white mt-0.5 truncate">{block.title}</div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge category={block.category} />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {completedCount}/{block.tasks.length}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
