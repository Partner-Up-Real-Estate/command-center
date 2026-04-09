'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  onSuccess?: () => void
}

export default function QuickAddModal({
  isOpen,
  onClose,
  defaultDate,
  onSuccess,
}: QuickAddModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDate(format(defaultDate, 'yyyy-MM-dd'))
      setTitle('')
      setStartTime('09:00')
      setDuration('60')
      setDescription('')
      setLocation('')
      setError('')
    }
  }, [isOpen, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Event title is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [hours, minutes] = startTime.split(':').map(Number)
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      const response = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          date,
          time: timeString,
          duration: parseInt(duration),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      setTitle('')
      setStartTime('09:00')
      setDuration('60')
      setDescription('')
      setLocation('')

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Event Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Call with client"
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="5"
            step="5"
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Zoom or office address"
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or agenda"
            rows={3}
            className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-colors resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
