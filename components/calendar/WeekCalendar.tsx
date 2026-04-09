'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { format, isSameDay, startOfDay, addHours } from 'date-fns'
import { CalendarEvent } from '@/types'
import { DAILY_BLOCKS } from '@/lib/blocks'

interface WeekCalendarProps {
  weekStart: Date
  events: Record<string, CalendarEvent[]>
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: Date, time: string) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i)
const HOUR_HEIGHT = 60

function getEventColor(title: string): string {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('mortgage') || lowerTitle.includes('deal') || lowerTitle.includes('call')) {
    return '#378ADD'
  }
  if (lowerTitle.includes('broki') || lowerTitle.includes('product') || lowerTitle.includes('growth')) {
    return '#534AB7'
  }
  if (lowerTitle.includes('content') || lowerTitle.includes('film') || lowerTitle.includes('post')) {
    return '#3B6D11'
  }
  if (lowerTitle.includes('gym') || lowerTitle.includes('workout') || lowerTitle.includes('personal')) {
    return '#888780'
  }

  return '#378ADD'
}

function getDayBlockColor(blockCategory: string): string {
  const colors: Record<string, string> = {
    mortgage: '#378ADD',
    broki: '#534AB7',
    personal: '#888780',
    content: '#3B6D11',
    ops: '#BA7517',
    referrals: '#A32D2D',
  }
  return colors[blockCategory] || '#378ADD'
}

interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
}

function calculateEventPosition(
  event: CalendarEvent,
  dayIndex: number,
  totalDays: number
): PositionedEvent | null {
  const startHour = event.start.getHours()
  const startMinutes = event.start.getMinutes()
  const endHour = event.end.getHours()
  const endMinutes = event.end.getMinutes()

  if (startHour < 7 || startHour >= 21) {
    return null
  }

  const relativeStart = startHour - 7 + startMinutes / 60
  const duration = (endHour - startHour) + (endMinutes - startMinutes) / 60

  const top = relativeStart * HOUR_HEIGHT
  const height = Math.max(duration * HOUR_HEIGHT, 30)
  const width = 100 / totalDays
  const left = (dayIndex * width)

  return { event, top, height, left, width }
}

export default function WeekCalendar({
  weekStart,
  events,
  onEventClick,
  onAddEvent,
}: WeekCalendarProps) {
  const [now, setNow] = useState<Date | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState(0)

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [weekStart])

  const today = useMemo(() => new Date(), [])
  const todayIndex = days.findIndex(d => isSameDay(d, today))

  const isCurrentWeek = useMemo(() => {
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1)
    return isSameDay(weekStart, currentWeekStart)
  }, [weekStart, today])

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isCurrentWeek || !now) return

    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()

    if (currentHour < 7 || currentHour >= 21) {
      setCurrentTimeLinePosition(-1)
      return
    }

    const relativeHour = currentHour - 7 + currentMinutes / 60
    const position = relativeHour * HOUR_HEIGHT
    setCurrentTimeLinePosition(position)

    if (scrollContainerRef.current && currentHour >= 7 && currentHour < 18) {
      scrollContainerRef.current.scrollTop = Math.max(0, position - 200)
    }
  }, [now, isCurrentWeek])

  const dayEvents = useMemo(() => {
    const result: (PositionedEvent | null)[][] = days.map((_, dayIndex) => {
      const dateKey = format(days[dayIndex], 'yyyy-MM-dd')
      const dayEventList = events[dateKey] || []

      return dayEventList
        .map(event => calculateEventPosition(event, dayIndex, 7))
        .filter((e): e is PositionedEvent => e !== null)
    })
    return result
  }, [days, events])

  const dayBlocks = useMemo(() => {
    return days.map((_, dayIndex) => {
      const blocksForDay = DAILY_BLOCKS.map(block => {
        const [blockStartHour, blockStartMinutes] = block.startTime
          .split(':')
          .map(p => parseInt(p))
        const [blockEndHour, blockEndMinutes] = block.endTime
          .split(':')
          .map(p => parseInt(p))

        const startMinutesTotal = blockStartHour * 60 + blockStartMinutes
        const endMinutesTotal = blockEndHour * 60 + blockEndMinutes
        const startInGrid = blockStartHour >= 7 && blockStartHour < 21
        const endInGrid = blockEndHour > 7 && blockEndHour <= 21

        if (!startInGrid && !endInGrid) return null

        const displayStart = Math.max(blockStartHour, 7)
        const displayEnd = Math.min(blockEndHour, 21)

        if (displayStart >= displayEnd) return null

        const top = (displayStart - 7) * HOUR_HEIGHT
        const height = (displayEnd - displayStart) * HOUR_HEIGHT

        return {
          block,
          top,
          height,
          color: getDayBlockColor(block.category),
        }
      }).filter(b => b !== null)

      return blocksForDay
    })
  }, [days])

  const handleCellClick = (dayIndex: number, hourIndex: number) => {
    const selectedDate = new Date(days[dayIndex])
    const selectedHour = 7 + hourIndex
    const timeString = `${String(selectedHour).padStart(2, '0')}:00`
    onAddEvent(selectedDate, timeString)
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex flex-col h-full bg-[#0D1117] rounded-lg border border-[#30363D] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#161B22] border-b border-[#30363D]">
        <div className="flex">
          {/* Time column header */}
          <div className="w-24 flex-shrink-0 px-4 py-3 border-r border-[#30363D]" />

          {/* Day headers */}
          {days.map((day, index) => {
            const isToday = isSameDay(day, today)
            const dateStr = format(day, 'd')

            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={`flex-1 px-2 py-3 text-center border-r border-[#30363D] transition-colors duration-200 ${
                  isToday ? 'bg-[#1C2333]' : ''
                }`}
              >
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {dayNames[index]}
                </div>
                <div
                  className={`text-sm font-bold ${
                    isToday ? 'text-[#378ADD]' : 'text-white'
                  }`}
                >
                  {dateStr}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex h-full min-h-min">
          {/* Time column */}
          <div className="w-24 flex-shrink-0 bg-[#0D1117] border-r border-[#30363D]">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-[60px] px-3 py-2 border-b border-[#30363D] flex items-start justify-end text-xs text-slate-500 font-medium"
              >
                {hour > 12 ? `${hour - 12}${hour >= 12 ? 'p' : 'a'}` : `${hour}a`}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="flex flex-1">
            {days.map((day, dayIndex) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const isToday = isSameDay(day, today)

              return (
                <div
                  key={dateKey}
                  className={`flex-1 border-r border-[#30363D] relative ${
                    isToday ? 'bg-[#0D1117]' : 'bg-[#0D1117]'
                  }`}
                >
                  {/* Daily blocks background */}
                  {dayBlocks[dayIndex].map((blockInfo, blockIndex) => (
                    <div
                      key={`block-${blockIndex}`}
                      className="absolute left-0 right-0 opacity-10 pointer-events-none transition-opacity"
                      style={{
                        top: `${blockInfo.top}px`,
                        height: `${blockInfo.height}px`,
                        backgroundColor: blockInfo.color,
                      }}
                    />
                  ))}

                  {/* Hour cells */}
                  {HOURS.map((hour, hourIndex) => (
                    <div
                      key={`cell-${hour}`}
                      className="h-[60px] border-b border-[#30363D] cursor-pointer hover:bg-[#1C2333] transition-colors duration-150 relative group"
                      onClick={() => handleCellClick(dayIndex, hourIndex)}
                    >
                      <div className="hidden group-hover:block absolute inset-0 bg-[#378ADD] opacity-5 pointer-events-none" />
                    </div>
                  ))}

                  {/* Events */}
                  {dayEvents[dayIndex].map((positioned, eventIndex) => {
                    if (!positioned) return null

                    const color = getEventColor(positioned.event.title)
                    const startTime = format(positioned.event.start, 'h:mm a')

                    return (
                      <div
                        key={`event-${eventIndex}`}
                        className="absolute left-1 right-1 rounded-md p-2 cursor-pointer transition-all duration-150 hover:shadow-lg hover:z-10 group"
                        style={{
                          top: `${positioned.top}px`,
                          height: `${positioned.height}px`,
                          backgroundColor: color,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(positioned.event)
                        }}
                      >
                        <div className="text-xs font-semibold text-white truncate group-hover:line-clamp-none">
                          {positioned.event.title}
                        </div>
                        <div className="text-xs text-white opacity-90">
                          {startTime}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current time line */}
        {isCurrentWeek && currentTimeLinePosition >= 0 && (
          <div
            className="absolute left-0 right-0 h-1 bg-red-500 z-30 pointer-events-none shadow-lg"
            style={{
              top: `${24 + currentTimeLinePosition}px`,
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            }}
          >
            <div className="absolute -left-3 -top-1.5 w-3 h-4 bg-red-500 rounded-full" />
          </div>
        )}
      </div>
    </div>
  )
}
