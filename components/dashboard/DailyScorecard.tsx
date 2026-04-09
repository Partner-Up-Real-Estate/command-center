'use client'

import { useState, useEffect } from 'react'
import { getDayState, updateScorecard } from '@/lib/storage'

const QUESTIONS = [
  'Did I generate leads?',
  'Did I convert conversations?',
  'Did I move Broki forward?',
  'Did I remove future work?',
  'Did I build relationships?',
]

interface DailyScorecardProps {
  selectedDate: Date
  onUpdate?: () => void
}

export default function DailyScorecard({ selectedDate, onUpdate }: DailyScorecardProps) {
  const [scorecard, setScorecard] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setScorecard(getDayState(selectedDate).scorecard)
  }, [selectedDate])

  const handleToggle = (index: number) => {
    const newVal = !scorecard[index]
    updateScorecard(selectedDate, index, newVal)
    setScorecard(prev => ({ ...prev, [index]: newVal }))
    onUpdate?.()
  }

  const score = Object.values(scorecard).filter(Boolean).length
  const scoreColor = score < 3 ? '#EF4444' : score < 5 ? '#F59E0B' : '#22C55E'

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Daily Scorecard</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold" style={{ color: scoreColor }}>{score}</span>
          <span className="text-sm text-slate-400">/ 5</span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {QUESTIONS.map((question, index) => {
          const isYes = !!scorecard[index]
          return (
            <button
              key={index}
              onClick={() => handleToggle(index)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#1C2333] transition-colors text-left"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isYes ? 'border-green-500 bg-green-500' : 'border-[#30363D]'}`}>
                {isYes && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${isYes ? 'text-slate-400' : 'text-white'}`}>{question}</span>
            </button>
          )
        })}
      </div>
      {score === 5 && (
        <div className="mx-3 mb-3 px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg text-center">
          <span className="text-green-400 text-sm font-medium">🔥 Perfect day, Jarrett!</span>
        </div>
      )}
    </div>
  )
}
