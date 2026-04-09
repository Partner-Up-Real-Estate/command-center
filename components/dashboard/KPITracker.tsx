'use client'

import { useState, useEffect } from 'react'
import { getDayState, updateKPI } from '@/lib/storage'

interface KPITrackerProps {
  selectedDate: Date
  onUpdate?: () => void
}

const KPIs = [
  { field: 'convos' as const, label: 'Conversations', min: 5, max: 15, color: '#378ADD' },
  { field: 'booked' as const, label: 'Booked Calls', min: 2, max: 5, color: '#534AB7' },
]

export default function KPITracker({ selectedDate, onUpdate }: KPITrackerProps) {
  const [kpis, setKpis] = useState({ convos: 0, booked: 0 })

  useEffect(() => {
    setKpis(getDayState(selectedDate).kpis)
  }, [selectedDate])

  const handleChange = (field: 'convos' | 'booked', delta: number) => {
    const newVal = Math.max(0, kpis[field] + delta)
    updateKPI(selectedDate, field, newVal)
    setKpis(prev => ({ ...prev, [field]: newVal }))
    onUpdate?.()
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D]">
        <h3 className="text-sm font-bold text-white">KPI Tracker</h3>
        <p className="text-xs text-slate-400 mt-0.5">Tap to update throughout the day</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {KPIs.map(({ field, label, min, max, color }) => {
          const value = kpis[field]
          const pct = Math.min((value / max) * 100, 100)
          const barColor = value === 0 ? '#EF4444' : value >= min ? '#22C55E' : '#F59E0B'

          return (
            <div key={field} className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-400 font-medium text-center">{label}</span>
              <div className="text-4xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-500">target: {min}–{max}</div>
              <div className="w-full h-1.5 bg-[#30363D] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChange(field, -1)}
                  className="w-8 h-8 rounded-lg bg-[#1C2333] hover:bg-[#252D3A] text-white text-lg font-bold transition-colors flex items-center justify-center border border-[#30363D]"
                >
                  −
                </button>
                <button
                  onClick={() => handleChange(field, 1)}
                  className="w-8 h-8 rounded-lg text-white text-lg font-bold transition-colors flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
