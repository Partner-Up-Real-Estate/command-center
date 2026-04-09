'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import WeekStrip from '@/components/dashboard/WeekStrip'
import MetricCards from '@/components/dashboard/MetricCards'
import BlockTimeline from '@/components/dashboard/BlockTimeline'
import CalendarEventsPanel from '@/components/dashboard/CalendarEventsPanel'
import BlockChecklist from '@/components/dashboard/BlockChecklist'
import KPITracker from '@/components/dashboard/KPITracker'
import DailyScorecard from '@/components/dashboard/DailyScorecard'
import WeekActivityChart from '@/components/dashboard/WeekActivityChart'
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
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchWeekEvents = useCallback(async (date: Date) => {
    setIsLoadingEvents(true)
    try {
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setDate(weekStart.getDate() + diff)
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

  useEffect(() => {
    if (session) {
      loadDayStateFromServer(selectedDate).then(() => setTick(t => t + 1))
    } else {
      setTick(t => t + 1)
    }
  }, [selectedDate, session])

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
        action.indices.forEach(i => updateScorecard(selectedDate, i, true))
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
        break
    }
  }, [selectedDate, fetchWeekEvents])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <PageShell selectedDate={selectedDate} onCommandAction={handleCommandAction} pageContext="dashboard">
      <div className="px-3 md:px-4 pt-3">
        {/* Week strip — TOP of page */}
        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          eventDates={Object.keys(weekEvents)}
        />

        {/* Metric cards */}
        <div className="mt-3">
          <MetricCards
            eventsCount={todayEvents.length}
            tasksCompleted={tasksCompleted}
            tasksTotal={tasksTotal}
            score={score}
            convos={dayState.kpis.convos}
          />
        </div>

        {/* 2-column layout (stacks on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-3">
          {/* LEFT: Daily OS Timeline */}
          <div className="lg:col-span-3 space-y-3">
            <BlockTimeline
              selectedDate={selectedDate}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
            />

            {/* Block checklist below timeline on mobile */}
            <div className="lg:hidden">
              <BlockChecklist
                blockId={selectedBlockId}
                selectedDate={selectedDate}
                onUpdate={() => setTick(t => t + 1)}
              />
            </div>
          </div>

          {/* RIGHT: Checklist + Events + KPI + Scorecard */}
          <div className="lg:col-span-2 space-y-3">
            {/* Desktop checklist */}
            <div className="hidden lg:block">
              <BlockChecklist
                blockId={selectedBlockId}
                selectedDate={selectedDate}
                onUpdate={() => setTick(t => t + 1)}
              />
            </div>
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
        <div className="mt-3 mb-4">
          <WeekActivityChart weekEvents={weekEvents} />
        </div>
      </div>
    </PageShell>
  )
}
