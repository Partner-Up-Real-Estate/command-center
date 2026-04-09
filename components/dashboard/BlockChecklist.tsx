'use client'

import { useState, useEffect } from 'react'
import { DAILY_BLOCKS, CATEGORY_COLORS } from '@/lib/blocks'
import { getDayState, updateChecklist } from '@/lib/storage'
import Badge from '@/components/ui/Badge'

interface BlockChecklistProps {
  blockId: string | null
  selectedDate: Date
  onUpdate?: () => void
}

export default function BlockChecklist({ blockId, selectedDate, onUpdate }: BlockChecklistProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setChecklist(getDayState(selectedDate).checklist)
  }, [selectedDate, blockId])

  const block = DAILY_BLOCKS.find(b => b.id === blockId)

  const handleToggle = (taskIndex: number) => {
    const key = `${blockId}_${taskIndex}`
    const newValue = !checklist[key]
    updateChecklist(selectedDate, key, newValue)
    setChecklist(prev => ({ ...prev, [key]: newValue }))
    onUpdate?.()
  }

  if (!block) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Block Checklist</h3>
        <div className="flex flex-col items-center justify-center h-28 text-center">
          <span className="text-2xl mb-2">←</span>
          <p className="text-slate-400 text-sm">Select a block to view its checklist</p>
        </div>
      </div>
    )
  }

  const completedCount = block.tasks.filter((_, i) => checklist[`${block.id}_${i}`]).length
  const color = CATEGORY_COLORS[block.category]

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-bold text-white truncate">{block.title}</span>
          <Badge category={block.category} />
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {completedCount}/{block.tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#30363D]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${block.tasks.length > 0 ? (completedCount / block.tasks.length) * 100 : 0}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="p-3 space-y-1">
        {block.tasks.map((task, index) => {
          const key = `${block.id}_${index}`
          const done = !!checklist[key]
          return (
            <button
              key={key}
              onClick={() => handleToggle(index)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1C2333] transition-colors text-left"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'border-green-500 bg-green-500' : 'border-[#30363D]'
                }`}
              >
                {done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
                {task}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
