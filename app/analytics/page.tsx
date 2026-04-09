'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, subDays, startOfWeek, addDays, isAfter, isBefore } from 'date-fns'
import PageShell from '@/components/layout/PageShell'
import { getDayState, getDayKey } from '@/lib/storage'
import { DAILY_BLOCKS, CATEGORY_COLORS } from '@/lib/blocks'
import type { BlockCategory } from '@/types'

type DateRange = 'today' | 'week' | 'last7' | 'last30'

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 10l5 5 5-5z" />
  </svg>
)

const TrendUpIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18 9 12.41l4 4 6.3-6.29L22 12v-6z" />
  </svg>
)

const AlertCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
)

interface MetricData {
  tasksCompleted: number
  tasksPlanned: number
  executionRate: number
  avgScore: number
  totalConvos: number
}

interface DayData {
  date: Date
  tasksDone: number
  tasksTotal: number
  score: number
  convos: number
  booked: number
  executionRate: number
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const dateRangeData = useMemo(() => {
    const today = new Date()
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 })

    switch (dateRange) {
      case 'today':
        return { start: today, end: today }
      case 'week':
        return { start: startOfCurrentWeek, end: addDays(startOfCurrentWeek, 6) }
      case 'last7':
        return { start: subDays(today, 6), end: today }
      case 'last30':
        return { start: subDays(today, 29), end: today }
    }
  }, [dateRange])

  const daysInRange = useMemo(() => {
    const days: Date[] = []
    let current = new Date(dateRangeData.start)
    while (isBefore(current, dateRangeData.end) || current.toDateString() === dateRangeData.end.toDateString()) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [dateRangeData])

  const dayDataList = useMemo(() => {
    return daysInRange.map((day) => {
      const dayState = getDayState(day)
      const checklistEntries = Object.values(dayState.checklist)
      const tasksDone = checklistEntries.filter(Boolean).length
      const tasksTotal = checklistEntries.length || 0

      const scoreValues = Object.values(dayState.scorecard)
      const scoreSum = scoreValues.filter(Boolean).length
      const score = scoreValues.length > 0 ? (scoreSum / scoreValues.length) * 5 : 0

      const executionRate = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0

      return {
        date: day,
        tasksDone,
        tasksTotal,
        score: Number(score.toFixed(1)),
        convos: dayState.kpis.convos,
        booked: dayState.kpis.booked,
        executionRate: Number(executionRate.toFixed(1)),
      }
    })
  }, [daysInRange])

  const metrics = useMemo<MetricData>(() => {
    const totalCompleted = dayDataList.reduce((sum, d) => sum + d.tasksDone, 0)
    const totalPlanned = dayDataList.reduce((sum, d) => sum + d.tasksTotal, 0)
    const avgScore = dayDataList.length > 0 ? dayDataList.reduce((sum, d) => sum + d.score, 0) / dayDataList.length : 0
    const totalConvos = dayDataList.reduce((sum, d) => sum + d.convos, 0)
    const executionRate = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0

    return {
      tasksCompleted: totalCompleted,
      tasksPlanned: totalPlanned,
      executionRate: Number(executionRate.toFixed(1)),
      avgScore: Number(avgScore.toFixed(1)),
      totalConvos,
    }
  }, [dayDataList])

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { completed: number; planned: number; color: string }> = {}

    Object.entries(CATEGORY_COLORS).forEach(([category, color]) => {
      breakdown[category] = { completed: 0, planned: 0, color }
    })

    dayDataList.forEach((day) => {
      const dayState = getDayState(day.date)
      DAILY_BLOCKS.forEach((block) => {
        const blockTasks = block.tasks.length
        const blockCategory = block.category
        breakdown[blockCategory].planned += blockTasks

        // Count completed tasks in this block
        const blockCompleted = block.tasks.filter((_, idx) => dayState.checklist[`${block.id}-${idx}`]).length
        breakdown[blockCategory].completed += blockCompleted
      })
    })

    return Object.entries(breakdown)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: data.planned > 0 ? (data.completed / data.planned) * 100 : 0,
      }))
      .filter((d) => d.planned > 0)
  }, [dayDataList])

  const performanceFlags = useMemo(() => {
    const missed: string[] = []
    const overloaded: string[] = []
    const strong: string[] = []

    DAILY_BLOCKS.forEach((block) => {
      let consecutiveZeroDays = 0
      let totalDays = 0
      let undoneDays = 0

      dayDataList.forEach((dayData) => {
        const dayState = getDayState(dayData.date)
        const blockTasks = block.tasks.length
        const completed = block.tasks.filter((_, idx) => dayState.checklist[`${block.id}-${idx}`]).length

        totalDays++
        if (completed === 0) {
          consecutiveZeroDays++
        } else {
          consecutiveZeroDays = 0
        }

        if (completed < blockTasks * 0.3) {
          undoneDays++
        }
      })

      if (consecutiveZeroDays >= 3) {
        missed.push(block.title)
      }

      if (totalDays > 0 && undoneDays / totalDays > 0.7) {
        overloaded.push(block.title)
      }

      if (totalDays > 0) {
        let successDays = 0
        dayDataList.forEach((dayData) => {
          const dayState = getDayState(dayData.date)
          const blockTasks = block.tasks.length
          const completed = block.tasks.filter((_, idx) => dayState.checklist[`${block.id}-${idx}`]).length
          if (completed / blockTasks > 0.8) {
            successDays++
          }
        })
        if (totalDays > 0 && successDays / totalDays > 0.8) {
          strong.push(block.title)
        }
      }
    })

    return { missed, overloaded, strong }
  }, [dayDataList])

  const consistencyScore = useMemo(() => {
    const onTrackDays = dayDataList.filter((d) => d.score >= 3).length
    const total = dayDataList.length
    return { onTrackDays, total }
  }, [dayDataList])

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D1117]">
        <div className="text-[#378ADD]">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const circleRadius = 45
  const circumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circumference - (consistencyScore.onTrackDays / consistencyScore.total) * circumference

  return (
    <PageShell pageContext="analytics">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics</h1>
              <p className="text-[#8B949E] text-sm mt-1">Performance metrics and insights</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2 flex-wrap">
            {(['today', 'week', 'last7', 'last30'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  dateRange === range
                    ? 'bg-[#378ADD] text-white'
                    : 'bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:border-[#378ADD] hover:text-white'
                }`}
              >
                {range === 'today' && 'Today'}
                {range === 'week' && 'This Week'}
                {range === 'last7' && 'Last 7 Days'}
                {range === 'last30' && 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tasks Completed */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#8B949E] text-sm font-medium">Tasks Completed</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {metrics.tasksCompleted} / {metrics.tasksPlanned}
                  </p>
                </div>
                <div className="p-2 bg-[#0D1117] rounded-lg">
                  <CheckCircleIcon />
                </div>
              </div>
            </div>

            {/* Execution Rate */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#8B949E] text-sm font-medium">Execution Rate</p>
                  <p className="text-3xl font-bold text-white mt-2">{metrics.executionRate}%</p>
                  <p className="text-[#6E7681] text-xs mt-1">of planned tasks</p>
                </div>
                <div className="p-2 bg-[#0D1117] rounded-lg">
                  <TrendUpIcon />
                </div>
              </div>
            </div>

            {/* Avg Daily Score */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#8B949E] text-sm font-medium">Avg Daily Score</p>
                  <p className="text-3xl font-bold text-white mt-2">{metrics.avgScore}/5</p>
                  <p className="text-[#6E7681] text-xs mt-1">across {dayDataList.length} days</p>
                </div>
                <div className="p-2 bg-[#0D1117] rounded-lg">
                  <span className="text-xl">★</span>
                </div>
              </div>
            </div>

            {/* Conversations Logged */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#8B949E] text-sm font-medium">Conversations Logged</p>
                  <p className="text-3xl font-bold text-white mt-2">{metrics.totalConvos}</p>
                  <p className="text-[#6E7681] text-xs mt-1">KPI conversations</p>
                </div>
                <div className="p-2 bg-[#0D1117] rounded-lg">
                  <span className="text-xl">💬</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Allocation Breakdown */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Task Completion by Category</h2>
            <div className="flex flex-col gap-3">
              {categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white capitalize">{item.category}</span>
                    <span className="text-xs text-[#8B949E]">
                      {item.completed} / {item.planned}
                      {' '}
                      ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <svg className="w-full h-8" viewBox={`0 0 400 20`} preserveAspectRatio="none">
                    <rect x="0" y="2" width={item.percentage * 4} height="16" fill={item.color} />
                    <rect x={item.percentage * 4} y="2" width={(100 - item.percentage) * 4} height="16" fill="#30363D" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Daily Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 px-4 text-[#8B949E] font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-[#8B949E] font-medium">Done/Total</th>
                  <th className="text-right py-3 px-4 text-[#8B949E] font-medium">Score</th>
                  <th className="text-right py-3 px-4 text-[#8B949E] font-medium">Convos</th>
                  <th className="text-right py-3 px-4 text-[#8B949E] font-medium">Booked</th>
                  <th className="text-right py-3 px-4 text-[#8B949E] font-medium">Execution %</th>
                </tr>
              </thead>
              <tbody>
                {dayDataList.map((day, idx) => {
                  const isLowExecution = day.executionRate < 50
                  const isPerfectScore = day.score === 5
                  let rowBg = 'hover:bg-[#1C2333]'
                  if (isLowExecution) rowBg = 'bg-red-600/5 hover:bg-red-600/10'
                  if (isPerfectScore) rowBg = 'bg-green-600/5 hover:bg-green-600/10'

                  return (
                    <tr key={idx} className={`border-b border-[#30363D] transition-colors ${rowBg}`}>
                      <td className="py-3 px-4 text-white">{format(day.date, 'EEE, MMM d')}</td>
                      <td className="py-3 px-4 text-right text-[#8B949E]">
                        {day.tasksDone}/{day.tasksTotal}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-medium">{day.score}/5</td>
                      <td className="py-3 px-4 text-right text-white">{day.convos}</td>
                      <td className="py-3 px-4 text-right text-white">{day.booked}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span className={isLowExecution ? 'text-red-400' : 'text-[#8B949E]'}>
                          {day.executionRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Performance Flags */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Missed Blocks */}
            {performanceFlags.missed.length > 0 && (
              <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircleIcon />
                  <h3 className="text-lg font-semibold text-red-400">Missed Blocks</h3>
                </div>
                <p className="text-sm text-red-300/70 mb-3">
                  No tasks completed for 3+ consecutive days:
                </p>
                <ul className="space-y-2">
                  {performanceFlags.missed.map((block, idx) => (
                    <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{block}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overloaded */}
            {performanceFlags.overloaded.length > 0 && (
              <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircleIcon />
                  <h3 className="text-lg font-semibold text-amber-400">Overloaded</h3>
                </div>
                <p className="text-sm text-amber-300/70 mb-3">
                  {'Blocks with >70% tasks undone:'}
                </p>
                <ul className="space-y-2">
                  {performanceFlags.overloaded.map((block, idx) => (
                    <li key={idx} className="text-sm text-amber-300 flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{block}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strong Areas */}
            {performanceFlags.strong.length > 0 && (
              <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon />
                  <h3 className="text-lg font-semibold text-green-400">Strong Areas</h3>
                </div>
                <p className="text-sm text-green-300/70 mb-3">
                  {'Blocks with >80% completion:'}
                </p>
                <ul className="space-y-2">
                  {performanceFlags.strong.map((block, idx) => (
                    <li key={idx} className="text-sm text-green-300 flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{block}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Consistency Score */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Consistency Score</h2>
            <div className="flex items-center justify-center gap-12">
              <div className="flex-shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#30363D" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="#378ADD"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                  <text
                    x="70"
                    y="75"
                    textAnchor="middle"
                    fontSize="28"
                    fontWeight="bold"
                    fill="#378ADD"
                  >
                    {Math.round((consistencyScore.onTrackDays / consistencyScore.total) * 100)}%
                  </text>
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-white mb-2">
                  {consistencyScore.onTrackDays} / {consistencyScore.total}
                </p>
                <p className="text-[#8B949E]">days on track (score ≥ 3/5)</p>
                <p className="text-[#6E7681] text-sm mt-2">
                  Keep building your streak for consistent momentum.
                </p>
              </div>
            </div>
          </div>
        </main>
    </PageShell>
  )
}
