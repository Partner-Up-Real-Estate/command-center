'use client'

import { useEffect, useState } from 'react'
import { DAILY_BLOCKS, CATEGORY_COLORS } from '@/lib/blocks'
import { getDayState, updateChecklist } from '@/lib/storage'

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

// Category-specific background tints for prominence
const CATEGORY_BG: Record<string, string> = {
  mortgage: 'bg-[#378ADD]/5 hover:bg-[#378ADD]/10',
  broki: 'bg-[#534AB7]/5 hover:bg-[#534AB7]/10',
  personal: 'bg-[#888780]/5 hover:bg-[#888780]/10',
  content: 'bg-[#3B6D11]/5 hover:bg-[#3B6D11]/10',
  ops: 'bg-[#BA7517]/5 hover:bg-[#BA7517]/10',
  referrals: 'bg-[#A32D2D]/5 hover:bg-[#A32D2D]/10',
}

const CATEGORY_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  broki: 'Broki',
  personal: 'Personal',
  content: 'Content',
  ops: 'Ops',
  referrals: 'Referrals',
}

export default function BlockTimeline({ selectedDate, selectedBlockId, onSelectBlock }: BlockTimelineProps) {
  const [now, setNow] = useState(new Date())
  const [dayState, setDayState] = useState(() => getDayState(selectedDate))
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setDayState(getDayState(selectedDate))
  }, [selectedDate])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const handleBlockClick = (blockId: string) => {
    // Desktop: notify parent (loads in side panel)
    onSelectBlock(blockId)
    // Mobile: toggle inline expansion
    setExpandedMobile(prev => (prev === blockId ? null : blockId))
  }

  const handleTaskToggle = (blockId: string, taskIndex: number) => {
    const key = `${blockId}_${taskIndex}`
    const newValue = !dayState.checklist[key]
    updateChecklist(selectedDate, key, newValue)
    setDayState(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: newValue },
    }))
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <h3 className="text-sm font-bold text-white">My Daily OS</h3>
        </div>
        <span className="text-xs text-slate-400">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="divide-y divide-[#21262D]">
        {DAILY_BLOCKS.map((block) => {
          const isSelected = selectedBlockId === block.id
          const isLive = isToday && isCurrentBlock(block.startTime, block.endTime)
          const completedCount = block.tasks.filter((_, i) =>
            dayState.checklist[`${block.id}_${i}`]
          ).length
          const allDone = completedCount === block.tasks.length
          const color = CATEGORY_COLORS[block.category]
          const bgClass = CATEGORY_BG[block.category] || ''
          const isExpandedMobile = expandedMobile === block.id

          return (
            <div key={block.id}>
              <button
                onClick={() => handleBlockClick(block.id)}
                className={`w-full text-left flex items-stretch transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1C2333] ring-1 ring-inset ring-[#378ADD]/30'
                    : isLive
                    ? 'bg-[#0D1117] ring-1 ring-inset ring-green-500/20'
                    : bgClass
                }`}
              >
                {/* Color bar — thicker for prominence */}
                <div
                  className={`w-1.5 flex-shrink-0 transition-all ${isLive ? 'w-2 animate-pulse' : ''}`}
                  style={{ backgroundColor: color }}
                />

                <div className="flex-1 px-3 py-3 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono whitespace-nowrap" style={{ color }}>
                        {block.startTime} – {block.endTime}
                      </span>
                      {isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white mt-1 truncate">{block.title}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Category pill */}
                    <span
                      className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      {CATEGORY_LABELS[block.category] || block.category}
                    </span>

                    {/* Progress */}
                    <div className={`flex items-center gap-1 text-xs font-medium ${allDone ? 'text-green-400' : 'text-slate-400'}`}>
                      {allDone ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : null}
                      <span>{completedCount}/{block.tasks.length}</span>
                    </div>

                    {/* Mobile chevron (inline expansion) */}
                    <svg
                      className={`md:hidden w-4 h-4 text-slate-400 transition-transform ${isExpandedMobile ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Mobile-only inline task dropdown */}
              {isExpandedMobile && (
                <div className="md:hidden bg-[#0D1117]/60 border-t border-[#21262D] animate-fade-in">
                  <div className="pl-5 pr-3 py-2 space-y-0.5">
                    {block.tasks.map((task, index) => {
                      const key = `${block.id}_${index}`
                      const done = !!dayState.checklist[key]
                      return (
                        <button
                          key={key}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTaskToggle(block.id, index)
                          }}
                          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg active:bg-[#1C2333] transition-colors text-left"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              done ? 'border-green-500 bg-green-500' : 'border-[#30363D]'
                            }`}
                          >
                            {done && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm flex-1 ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
                            {task}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
