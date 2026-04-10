'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/types'

interface EventEditorProps {
  mode: 'create' | 'edit'
  initial?: Partial<CalendarEvent>
  defaultDate: Date
  defaultHour?: number
  onClose: () => void
  onSaved: () => void
}

export default function EventEditor({
  mode,
  initial,
  defaultDate,
  defaultHour,
  onClose,
  onSaved,
}: EventEditorProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(() => {
    const d = initial?.start ? new Date(initial.start) : defaultDate
    return format(d, 'yyyy-MM-dd')
  })
  const [time, setTime] = useState(() => {
    if (initial?.start) return format(new Date(initial.start), 'HH:mm')
    if (defaultHour !== undefined) return `${String(defaultHour).padStart(2, '0')}:00`
    return '09:00'
  })
  const [duration, setDuration] = useState(() => {
    if (initial?.start && initial?.end) {
      const d = (new Date(initial.end).getTime() - new Date(initial.start).getTime()) / 60000
      return Math.round(d)
    }
    return 60
  })
  const [description, setDescription] = useState(initial?.description || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (mode === 'create') {
        const res = await fetch('/api/calendar/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, time, duration, description, location }),
        })
        if (!res.ok) throw new Error('Failed to create event')
      } else if (mode === 'edit' && initial?.id) {
        const res = await fetch('/api/calendar/event', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: initial.id,
            title,
            date,
            time,
            duration,
            description,
            location,
          }),
        })
        if (!res.ok) throw new Error('Failed to update event')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initial?.id) return
    if (!confirm('Delete this event? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/event?eventId=${encodeURIComponent(initial.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center md:justify-center safe-area-top"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1117] border border-[#30363D] w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#161B22] flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {mode === 'create' ? 'New Event' : 'Edit Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white active:bg-[#161B22] rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto smooth-scroll">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Client call with John"
              className="w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#378ADD]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                Start Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#378ADD]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              Duration
            </label>
            <div className="mt-1 flex gap-1 flex-wrap">
              {[15, 30, 45, 60, 90, 120].map(m => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    duration === m
                      ? 'bg-[#378ADD] text-white'
                      : 'bg-[#161B22] text-slate-400 border border-[#30363D] active:bg-[#1C2333]'
                  }`}
                >
                  {m < 60 ? `${m}m` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ''}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Optional"
              className="w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes or agenda"
              className="w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD] resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#161B22] flex items-center gap-2 safe-area-bottom">
          {mode === 'edit' && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold active:bg-red-500/20 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="px-4 py-2.5 text-slate-400 rounded-lg text-sm font-semibold active:bg-[#161B22] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || deleting || !title.trim()}
            className="px-5 py-2.5 bg-[#378ADD] text-white rounded-lg text-sm font-bold active:bg-[#2d6ab5] disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
