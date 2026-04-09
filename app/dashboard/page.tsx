'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import WeekStrip from '@/components/dashboard/WeekStrip'
import MetricCards from '@/components/dashboard/MetricCards'
import BlockTimeline from '@/components/dashboard/BlockTimeline'
import CalendarEventsPanel from '@/components/dashboard/CalendarEventsPanel'
import BlockChecklist from '@/components/dashboard/BlockChecklist'
import KPITracker from '@/components/dashboard/KPITracker'
import DailyScorecard from '@/components/dashboard/DailyScorecard'
import WeekActivityChart from '@/components/dashboard/WeekActivityChart'
import CommandBar from '@/components/dashboard/CommandBar'
import { DAILY_BLOCKS } from '@/lib/blocks'
import { getDayState, updateChecklist, updateKPI, updateScorecard, loadDayStateFromServer } from '@/lib/storage'
import type { CalendarEvent, CommandAction } from '@/types'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [weekEvents, setWeekEvents] = useState<Record<string, CalendarEvent[]>>({})
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchWeekEvents = useCallback(async (date: Date) => {
    setIsLoadingEvents(true)
    try {
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setDate(weekStart.getDate() + diff)
      // Use Hawaii-local date string for consistency
      const weekStartStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Honolulu',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(weekStart)
      const res = await fetch(`/api/calendar/events?weekStart=${weekStartStr}`)
      if (res.ok) {
        const data = await res.json()
        setWeekEvents(data.weekEvents || {})
      }
    } catch (e) {
      console.error('Failed to fetch events', e)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (session) fetchWeekEvents(selectedDate)
  }, [session, selectedDate, fetchWeekEvents])

  // Hydrate localStorage from Supabase when date changes
  useEffect(() => {
    if (session) {
      loadDayStateFromServer(selectedDate).then(() => {
        setTick(t => t + 1)
      })
    } else {
      setTick(t => t + 1)
    }
  }, [selectedDate, session])

  // Use Intl to get Hawaii date key, matching how getWeekEvents groups events
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Honolulu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(selectedDate)
  const todayEvents = weekEvents[todayStr] || []
  const dayState = getDayState(selectedDate)

  const tasksTotal = DAILY_BLOCKS.reduce((sum, b) => sum + b.tasks.length, 0)
  const tasksCompleted = DAILY_BLOCKS.reduce((sum, b) => {
    return sum + b.tasks.filter((_, i) => dayState.checklist[`${b.id}_${i}`]).length
  }, 0)

  const score = Object.values(dayState.scorecard).filter(Boolean).length

  const handleCommandAction = useCallback((action: CommandAction) => {
    switch (action.type) {
      case 'check_tasks':
        action.items.forEach(({ blockId, taskIndex }) => {
          updateChecklist(selectedDate, `${blockId}_${taskIndex}`, true)
        })
        setTick(t => t + 1)
        break
      case 'update_kpi':
        updateKPI(selectedDate, action.field, action.value)
        setTick(t => t + 1)
        break
      case 'check_scorecard':
        action.indices.forEach(i => {
          updateScorecard(selectedDate, i, true)
        })
        setTick(t => t + 1)
        break
      case 'create_event':
        fetch('/api/calendar/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        }).then(() => fetchWeekEvents(selectedDate))
        break
      case 'message':
        // informational only — no state change needed
        break
    }
  }, [selectedDate, fetchWeekEvents])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-[#0D1117]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* Command Bar */}
        <div className="px-4 pt-2 pb-2 border-b border-[#161B22]">
          <CommandBar selectedDate={selectedDate} onAction={handleCommandAction} />
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Metric cards row */}
          <div className="pt-4">
            <MetricCards
              eventsCount={todayEvents.length}
              tasksCompleted={tasksCompleted}
              tasksTotal={tasksTotal}
              score={score}
              convos={dayState.kpis.convos}
            />
          </div>

          {/* Week strip */}
          <div className="mt-4">
            <WeekStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventDates={Object.keys(weekEvents)}
            />
          </div>

          {/* 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
            {/* LEFT: 3/5 width — Daily OS Timeline + Block Checklist below */}
            <div className="lg:col-span-3 space-y-4">
              <BlockTimeline
                selectedDate={selectedDate}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
              />
            </div>

            {/* RIGHT: 2/5 width — Checklist (always visible) + Calendar Events + KPI + Scorecard */}
            <div className="lg:col-span-2 space-y-4">
              <BlockChecklist
                blockId={selectedBlockId}
                selectedDate={selectedDate}
                onUpdate={() => setTick(t => t + 1)}
              />
              <CalendarEventsPanel
                events={todayEvents}
                selectedDate={selectedDate}
                onAddEvent={() => {}}
                isLoading={isLoadingEvents}
              />
              <KPITracker
                selectedDate={selectedDate}
                onUpdate={() => setTick(t => t + 1)}
              />
              <DailyScorecard
                selectedDate={selectedDate}
                onUpdate={() => setTick(t => t + 1)}
              />
            </div>
          </div>

          {/* Week activity chart */}
          <div className="mt-4">
            <WeekActivityChart weekEvents={weekEvents} />
          </div>
        </main>
      </div>
    </div>
  )
}
