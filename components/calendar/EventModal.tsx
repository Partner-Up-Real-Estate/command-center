'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { CalendarEvent } from '@/types'

interface EventModalProps {
  event: CalendarEvent | null
  onClose: () => void
}

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
  </svg>
)

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

export default function EventModal({ event, onClose }: EventModalProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  if (!event) return null

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(onClose, 200)
  }

  const color = getEventColor(event.title)
  const startDate = format(event.start, 'EEEE, MMMM d, yyyy')
  const startTime = format(event.start, 'h:mm a')
  const endTime = format(event.end, 'h:mm a')

  const durationMs = event.end.getTime() - event.start.getTime()
  const durationMinutes = Math.round(durationMs / (1000 * 60))
  const durationHours = Math.floor(durationMinutes / 60)
  const durationMinsRemainder = durationMinutes % 60

  let durationText = ''
  if (durationHours > 0) {
    durationText += `${durationHours}h`
    if (durationMinsRemainder > 0) {
      durationText += ` ${durationMinsRemainder}m`
    }
  } else {
    durationText = `${durationMinutes}m`
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-200 ${
          isAnimatingOut ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[#161B22] border-l border-[#30363D] z-50 shadow-2xl overflow-y-auto transition-transform duration-200 ${
          isAnimatingOut ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 px-6 py-4 border-b border-[#30363D] bg-[#161B22] flex items-start justify-between">
          <div
            className="w-1 h-12 rounded-full flex-shrink-0 mr-4"
            style={{ backgroundColor: color }}
          />
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
            aria-label="Close event details"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-white">{event.title}</h2>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-slate-400">
                <CalendarIcon />
              </div>
              <div>
                <div className="text-sm text-slate-400">Date</div>
                <div className="text-base text-white font-medium">{startDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-slate-400">
                <ClockIcon />
              </div>
              <div>
                <div className="text-sm text-slate-400">Time</div>
                <div className="text-base text-white font-medium">
                  {startTime} – {endTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-slate-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 1H9v2h6V1zm4.03 12.98l1.41-1.41c.39-.39.39-1.02 0-1.41l-1.06-1.06c-.39-.39-1.02-.39-1.41 0l-1.41 1.41C16.07 11.66 15.12 11.5 14 11.5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5c0-1.12-.16-2.07-.97-2.98zM17 17c-1.1 0-2-1.34-2-3s.9-3 2-3 2 1.34 2 3-.9 3-2 3z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-400">Duration</div>
                <div className="text-base text-white font-medium">{durationText}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed bg-[#0D1117] p-3 rounded-lg">
                {event.description}
              </p>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LocationIcon />
                <h3 className="text-sm font-semibold text-slate-400">Location</h3>
              </div>
              <p className="text-sm text-slate-300 bg-[#0D1117] p-3 rounded-lg">
                {event.location}
              </p>
            </div>
          )}

          {/* Google Calendar Link */}
          <div className="pt-4 border-t border-[#30363D]">
            <a
              href={`https://calendar.google.com/calendar/r/eventedit/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#378ADD] hover:bg-[#2D6FC0] text-white text-sm font-semibold rounded-lg transition-colors duration-200 w-full justify-center"
            >
              <ExternalLinkIcon />
              Open in Google Calendar
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
