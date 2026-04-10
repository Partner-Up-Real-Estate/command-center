'use client'

import { useEffect, useRef, useState } from 'react'
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns'
import { DAILY_BLOCKS } from '@/lib/blocks'
import type { CalendarEvent, DailyBlock } from '@/types'

interface MobileDayViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onSelectDate: (d: Date) => void
  onEventClick: (e: CalendarEvent) => void
  onBlockClick?: (b: DailyBlock) => void
  onAddEvent: (hour?: number) => void
  isLoading: boolean
}

// Pixel height per hour — zoomed in for mobile
const HOUR_HEIGHT = 72
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function parseBlockTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + (m || 0)
}

function hourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

export default function MobileDayView({
  selectedDate,
  events,
  onSelectDate,
  onEventClick,
  onBlockClick,
  onAddEvent,
  isLoading,
}: MobileDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll to current time (or 8am if not today) on mount / date change
  useEffect(() => {
    if (!scrollRef.current) return
    const target = isToday(selectedDate)
      ? (now.getHours() * 60 + now.getMinutes()) / 60
      : 8
    // Scroll so the target hour sits ~1/3 from the top
    const top = Math.max(0, target * HOUR_HEIGHT - 120)
    scrollRef.current.scrollTo({ top, behavior: 'smooth' })
  }, [selectedDate, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT

  return (
    <div className="flex flex-col h-full">
      {/* Day selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#161B22] bg-[#0D1117]">
        <button
          onClick={() => onSelectDate(subDays(selectedDate, 1))}
          className="p-2 active:bg-[#161B22] rounded-lg text-slate-400"
          aria-label="Previous day"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button
          onClick={() => onSelectDate(new Date())}
          className="flex-1 text-center"
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            {format(selectedDate, 'EEEE')}
          </div>
          <div className={`text-base font-bold ${isToday(selectedDate) ? 'text-[#378ADD]' : 'text-white'}`}>
            {format(selectedDate, 'MMMM d, yyyy')}
            {isToday(selectedDate) && <span className="ml-2 text-[10px] bg-[#378ADD]/20 text-[#378ADD] px-1.5 py-0.5 rounded-full">TODAY</span>}
          </div>
        </button>
        <button
          onClick={() => onSelectDate(addDays(selectedDate, 1))}
          className="p-2 active:bg-[#161B22] rounded-lg text-slate-400"
          aria-label="Next day"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* Quick day strip */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#161B22] bg-[#0D1117] overflow-x-auto smooth-scroll">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(subDays(selectedDate, 3), i)
          const selected = isSameDay(d, selectedDate)
          const today = isToday(d)
          return (
            <button
              key={i}
              onClick={() => onSelectDate(d)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-lg transition-colors ${
                selected
                  ? 'bg-[#378ADD] text-white'
                  : today
                  ? 'bg-[#378ADD]/10 text-[#378ADD]'
                  : 'bg-[#161B22] text-slate-400 active:bg-[#1C2333]'
              }`}
            >
              <span className="text-[9px] uppercase font-medium">{format(d, 'EEE')}</span>
              <span className="text-lg font-bold leading-none mt-0.5">{format(d, 'd')}</span>
            </button>
          )
        })}
      </div>

      {/* Lane headers */}
      <div className="flex items-center px-3 py-1.5 border-b border-[#161B22] bg-[#0D1117] text-[9px] font-bold uppercase tracking-wider">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 text-center text-slate-500">Daily OS</div>
        <div className="flex-1 text-center text-[#378ADD]">Events</div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto smooth-scroll relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0D1117]/80 z-30 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour rows */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex border-t border-[#161B22]"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <div className="w-14 flex-shrink-0 pt-0.5 text-right pr-2">
                <span className="text-[10px] text-[#484F58] font-mono">{hourLabel(hour)}</span>
              </div>
              <button
                onClick={() => onAddEvent(hour)}
                className="flex-1 active:bg-[#378ADD]/5"
                aria-label={`Add event at ${hourLabel(hour)}`}
              />
            </div>
          ))}

          {/* Half-hour dividers */}
          {HOURS.map(hour => (
            <div
              key={`half-${hour}`}
              className="absolute left-14 right-0 border-t border-dashed border-[#161B22]/40"
              style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
            />
          ))}

          {/* Two-lane content area: Daily OS (left) + Events (right) */}
          <div className="absolute left-14 right-2 top-0 bottom-0">
            {/* Daily OS blocks — left lane */}
            {DAILY_BLOCKS.map(block => {
              const startMin = parseBlockTime(block.startTime)
              const endMin = parseBlockTime(block.endTime)
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = ((endMin - startMin) / 60) * HOUR_HEIGHT
              return (
                <button
                  key={block.id}
                  onClick={() => onBlockClick?.(block)}
                  className="absolute rounded-lg px-2 py-1.5 text-left overflow-hidden border transition-all press shadow-md"
                  style={{
                    top,
                    left: '2px',
                    width: 'calc(50% - 4px)',
                    height: Math.max(height, 32),
                    backgroundColor: block.color + '33',
                    borderColor: block.color + '99',
                    borderLeftWidth: '3px',
                    borderLeftColor: block.color,
                  }}
                >
                  <div
                    className="text-[11px] font-bold truncate leading-tight"
                    style={{ color: block.color }}
                  >
                    {block.title}
                  </div>
                  <div className="text-[9px] text-slate-300 opacity-80 truncate mt-0.5">
                    {block.startTime.replace(':00 ', '').toLowerCase()} – {block.endTime.replace(':00 ', '').toLowerCase()}
                  </div>
                </button>
              )
            })}

            {/* Events — right lane */}
            {events.map(event => {
              const s = new Date(event.start)
              const e = new Date(event.end)
              if (!isSameDay(s, selectedDate)) return null
              const startMin = s.getHours() * 60 + s.getMinutes()
              const dur = Math.max(15, (e.getTime() - s.getTime()) / 60000)
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = (dur / 60) * HOUR_HEIGHT
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute bg-gradient-to-br from-[#378ADD] to-[#2a6fb8] text-white rounded-lg px-2 py-1.5 text-left overflow-hidden border border-[#378ADD] shadow-lg z-10 transition-all press"
                  style={{
                    top,
                    left: 'calc(50% + 2px)',
                    width: 'calc(50% - 4px)',
                    height: Math.max(height, 32),
                  }}
                >
                  <div className="text-[11px] font-bold truncate leading-tight">{event.title}</div>
                  <div className="text-[9px] opacity-90 truncate mt-0.5">
                    {format(s, 'h:mm a')}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Now indicator */}
          {isToday(selectedDate) && (
            <div
              className="absolute left-14 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1 ring-2 ring-red-500/30" />
              <div className="flex-1 h-[2px] bg-red-500" />
              <span className="text-[9px] font-mono text-red-500 bg-[#0D1117] px-1">
                {format(now, 'h:mm')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add button */}
      <button
        onClick={() => onAddEvent()}
        className="fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#378ADD] to-[#2a6fb8] active:scale-95 shadow-xl flex items-center justify-center text-white press animate-pulse-ring"
        aria-label="Add event"
        style={{ boxShadow: '0 10px 30px rgba(55, 138, 221, 0.5)' }}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </div>
  )
}
