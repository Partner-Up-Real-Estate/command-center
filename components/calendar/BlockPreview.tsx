'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { DailyBlock } from '@/types'
import { getDayState, updateChecklist } from '@/lib/storage'

interface BlockPreviewProps {
  block: DailyBlock
  date: Date
  onClose: () => void
}

export default function BlockPreview({ block, date, onClose }: BlockPreviewProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const state = getDayState(date)
    setChecklist(state.checklist || {})
  }, [date])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (idx: number) => {
    const key = `${block.id}_${idx}`
    const next = !checklist[key]
    updateChecklist(date, key, next)
    setChecklist(prev => ({ ...prev, [key]: next }))
  }

  const completed = block.tasks.filter((_, i) => checklist[`${block.id}_${i}`]).length
  const total = block.tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const dateStr = format(date, 'EEE, MMM d')

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center md:justify-center safe-area-top animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1117] border border-[#30363D] w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up md:animate-scale-in shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: `0 20px 60px -20px ${block.color}60` }}
      >
        {/* Colored header */}
        <div
          className="relative px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${block.color}25 0%, ${block.color}10 100%)`,
            borderBottom: `1px solid ${block.color}40`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: block.color }}
                />
                <span
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: block.color }}
                >
                  {block.category}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{block.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {block.startTime} – {block.endTime} · {dateStr}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white active:bg-white/10 rounded-lg flex-shrink-0 press"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
              <span className="text-slate-400">Progress</span>
              <span style={{ color: block.color }}>
                {completed}/{total} · {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-[#161B22] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${block.color}80, ${block.color})`,
                  boxShadow: `0 0 12px ${block.color}60`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto smooth-scroll">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
            Tasks
          </div>
          <div className="space-y-2 stagger">
            {block.tasks.map((task, i) => {
              const key = `${block.id}_${i}`
              const done = !!checklist[key]
              return (
                <button
                  key={key}
                  onClick={() => toggle(i)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left press transition-all ${
                    done
                      ? 'bg-[#161B22] border-[#30363D]'
                      : 'bg-[#0D1117] border-[#30363D] active:bg-[#161B22]'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      done ? 'scale-100' : 'scale-95'
                    }`}
                    style={{
                      borderColor: done ? block.color : '#30363D',
                      backgroundColor: done ? block.color : 'transparent',
                    }}
                  >
                    {done && (
                      <svg
                        className="w-3 h-3 text-white animate-pop-in"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`flex-1 text-sm leading-snug ${
                      done ? 'text-slate-500 line-through' : 'text-white'
                    }`}
                  >
                    {task}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#161B22] flex items-center justify-between safe-area-bottom">
          <div className="text-xs text-slate-500">
            {completed === total && total > 0 ? '🎉 All done' : `${total - completed} remaining`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg press"
            style={{ backgroundColor: block.color }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
