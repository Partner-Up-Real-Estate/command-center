'use client'

import { useState } from 'react'
import { CalendarEvent } from '@/types'
import EventPreview from '@/components/calendar/EventPreview'
import EventEditor from '@/components/calendar/EventEditor'

interface CalendarEventsPanelProps {
  events: CalendarEvent[]
  selectedDate: Date
  onAddEvent: () => void
  isLoading: boolean
  onEventsChanged?: () => void
}

function getMeetingUrl(event: CalendarEvent): string | null {
  // Check hangoutLink first (Google Meet)
  if (event.hangoutLink) return event.hangoutLink
  // Check conferenceData entry points
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video'
    )
    if (videoEntry?.uri) return videoEntry.uri
  }
  // Check description for Zoom/Teams/Meet links
  if (event.description) {
    const urlMatch = event.description.match(
      /https?:\/\/(?:[\w-]+\.)?(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)\/[^\s<"')]+/i
    )
    if (urlMatch) return urlMatch[0]
  }
  return null
}

function getPhoneNumber(event: CalendarEvent): string | null {
  if (event.conferenceData?.entryPoints) {
    const phoneEntry = event.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'phone'
    )
    if (phoneEntry?.uri) {
      const num = phoneEntry.uri.replace('tel:', '')
      const pin = phoneEntry.pin ? ` PIN: ${phoneEntry.pin}` : ''
      return `${num}${pin}`
    }
  }
  return null
}

export default function CalendarEventsPanel({
  events,
  selectedDate,
  onAddEvent,
  isLoading,
  onEventsChanged,
}: CalendarEventsPanelProps) {
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Pacific/Honolulu',
    })
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Today's Events</h3>
        <button
          onClick={onAddEvent}
          className="px-3 py-1 text-xs bg-[#378ADD] text-white rounded-lg hover:bg-[#2a6ab8] transition-colors font-medium"
        >
          + Add
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400 text-sm">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400 text-sm">No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const startTime = formatTime(event.start)
            const endTime = formatTime(event.end)
            const meetingUrl = getMeetingUrl(event)
            const phoneNumber = getPhoneNumber(event)
            const attendeeCount = event.attendees?.length || 0

            return (
              <div
                key={event.id}
                onClick={() => setPreviewEvent(event)}
                className="p-3 bg-[#0D1117] hover:bg-[#1C2333] active:bg-[#1C2333] rounded-lg border border-[#30363D] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {startTime} – {endTime}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#378ADD] mt-1.5" />
                </div>

                {/* Meeting link */}
                {meetingUrl && (
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-2 text-xs text-[#378ADD] hover:text-[#5ba0e8] transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                    <span className="truncate group-hover:underline">
                      {meetingUrl.includes('zoom.us') ? 'Join Zoom Meeting' :
                       meetingUrl.includes('teams.microsoft') ? 'Join Teams Meeting' :
                       meetingUrl.includes('meet.google') ? 'Join Google Meet' :
                       'Join Meeting'}
                    </span>
                  </a>
                )}

                {/* Phone dial-in */}
                {phoneNumber && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    <span>{phoneNumber}</span>
                  </div>
                )}

                {/* Attendees count */}
                {attendeeCount > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                    <span>{attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {previewEvent && !editingEvent && (
        <EventPreview
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onEdit={() => setEditingEvent(previewEvent)}
          onDeleted={() => {
            setPreviewEvent(null)
            onEventsChanged?.()
          }}
        />
      )}

      {editingEvent && (
        <EventEditor
          mode="edit"
          initial={editingEvent}
          defaultDate={new Date(editingEvent.start)}
          onClose={() => setEditingEvent(null)}
          onSaved={() => {
            setEditingEvent(null)
            setPreviewEvent(null)
            onEventsChanged?.()
          }}
        />
      )}
    </div>
  )
}
