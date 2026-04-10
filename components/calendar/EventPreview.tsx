'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/types'

interface EventPreviewProps {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  iconLink?: string
  modifiedTime?: string
}

function getMeetingUrl(event: CalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      ep => ep.entryPointType === 'video'
    )
    if (videoEntry?.uri) return videoEntry.uri
  }
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
      ep => ep.entryPointType === 'phone'
    )
    if (phoneEntry?.uri) return phoneEntry.uri.replace('tel:', '')
  }
  return null
}

export default function EventPreview({ event, onClose, onEdit, onDeleted }: EventPreviewProps) {
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [loadingContext, setLoadingContext] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [creatingDoc, setCreatingDoc] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const meetingUrl = getMeetingUrl(event)
  const phoneNumber = getPhoneNumber(event)
  const externalAttendees = (event.attendees || []).filter(
    a => !a.email.includes('jarrett@whiteridge')
  )
  const primaryAttendee = externalAttendees[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load context: Gmail thread, Drive files
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingContext(true)
      try {
        const promises: Promise<any>[] = []

        // Gmail thread by primary attendee email
        if (primaryAttendee?.email) {
          promises.push(
            fetch(`/api/gmail/thread?email=${encodeURIComponent(primaryAttendee.email)}`)
              .then(r => (r.ok ? r.json() : { messages: [] }))
              .catch(() => ({ messages: [] }))
          )
        } else {
          promises.push(Promise.resolve({ messages: [] }))
        }

        // Drive files by event title
        promises.push(
          fetch(`/api/drive/search?q=${encodeURIComponent(event.title)}`)
            .then(r => (r.ok ? r.json() : { files: [] }))
            .catch(() => ({ files: [] }))
        )

        const [gmailData, driveData] = await Promise.all(promises)
        if (cancelled) return
        setGmailMessages((gmailData.messages || []).slice(0, 3))
        setDriveFiles((driveData.files || []).slice(0, 4))
      } finally {
        if (!cancelled) setLoadingContext(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [event.id, primaryAttendee?.email, event.title])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/event?eventId=${encodeURIComponent(event.id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onDeleted()
        onClose()
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateTask = async () => {
    setCreatingTask(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Follow up: ${event.title}`,
          notes: `Follow up on meeting with ${externalAttendees.map(a => a.displayName || a.email).join(', ')}`,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
      if (res.ok) showToast('Follow-up task created')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleCreateNotesDoc = async () => {
    setCreatingDoc(true)
    try {
      const res = await fetch('/api/docs/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${event.title} — Notes`,
          attendees: externalAttendees.map(a => a.displayName || a.email),
          agenda: event.description || '',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.doc?.url) {
          window.open(data.doc.url, '_blank')
          showToast('Notes doc created')
        }
      }
    } finally {
      setCreatingDoc(false)
    }
  }

  const handleEmailAttendees = () => {
    const emails = externalAttendees.map(a => a.email).join(',')
    const subject = encodeURIComponent(`Re: ${event.title}`)
    window.open(`mailto:${emails}?subject=${subject}`, '_blank')
  }

  const startTime = format(new Date(event.start), 'h:mm a')
  const endTime = format(new Date(event.end), 'h:mm a')
  const dateStr = format(new Date(event.start), 'EEE, MMM d')

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center md:justify-center safe-area-top animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1117] border border-[#30363D] w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up md:animate-scale-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#161B22] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight">{event.title}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {dateStr} · {startTime} – {endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white active:bg-[#161B22] rounded-lg flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto smooth-scroll">
          {/* Meeting link / phone */}
          {meetingUrl && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#378ADD] text-white rounded-lg px-4 py-3 font-semibold text-sm active:bg-[#2d6ab5]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
              {meetingUrl.includes('meet.google') ? 'Join Google Meet' :
               meetingUrl.includes('zoom.us') ? 'Join Zoom' :
               meetingUrl.includes('teams.microsoft') ? 'Join Teams' : 'Join Meeting'}
            </a>
          )}

          {phoneNumber && (
            <a
              href={`tel:${phoneNumber}`}
              className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-3 font-semibold text-sm active:bg-green-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              Call {phoneNumber}
            </a>
          )}

          {/* Location */}
          {event.location && !meetingUrl && (
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {externalAttendees.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
                Attendees ({externalAttendees.length})
              </div>
              <div className="space-y-1.5 stagger">
                {externalAttendees.map(a => (
                  <div
                    key={a.email}
                    className="flex items-center gap-2.5 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2"
                  >
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#378ADD] to-[#534AB7] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {(a.displayName || a.email)[0].toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {a.displayName || a.email.split('@')[0]}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{a.email}</div>
                    </div>
                    {a.responseStatus && (
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          a.responseStatus === 'accepted'
                            ? 'bg-green-500/15 text-green-400'
                            : a.responseStatus === 'declined'
                            ? 'bg-red-500/15 text-red-400'
                            : a.responseStatus === 'tentative'
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {a.responseStatus === 'needsAction' ? 'pending' : a.responseStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">
                Notes
              </div>
              <div className="text-sm text-slate-300 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {event.description.replace(/<[^>]+>/g, '')}
              </div>
            </div>
          )}

          {/* Gmail thread */}
          {primaryAttendee && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">
                Recent Emails with {primaryAttendee.displayName || primaryAttendee.email.split('@')[0]}
              </div>
              {loadingContext ? (
                <div className="text-xs text-slate-500 py-2">Loading...</div>
              ) : gmailMessages.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No recent emails found</div>
              ) : (
                <div className="space-y-1.5">
                  {gmailMessages.map(msg => (
                    <a
                      key={msg.id}
                      href={`https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 active:bg-[#1C2333]"
                    >
                      <div className="text-xs font-semibold text-white truncate">{msg.subject || '(no subject)'}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{msg.snippet}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drive files */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">
              Related Files
            </div>
            {loadingContext ? (
              <div className="text-xs text-slate-500 py-2">Loading...</div>
            ) : driveFiles.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">No related files found</div>
            ) : (
              <div className="space-y-1.5">
                {driveFiles.map(f => (
                  <a
                    key={f.id}
                    href={f.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 active:bg-[#1C2333]"
                  >
                    {f.iconLink && <img src={f.iconLink} alt="" className="w-4 h-4" />}
                    <span className="text-xs text-white truncate flex-1">{f.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              {externalAttendees.length > 0 && (
                <button
                  onClick={handleEmailAttendees}
                  className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs font-semibold text-white active:bg-[#1C2333] flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  Email
                </button>
              )}
              <button
                onClick={handleCreateTask}
                disabled={creatingTask}
                className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs font-semibold text-white active:bg-[#1C2333] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                {creatingTask ? '...' : 'Follow-up'}
              </button>
              <button
                onClick={handleCreateNotesDoc}
                disabled={creatingDoc}
                className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs font-semibold text-white active:bg-[#1C2333] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
                {creatingDoc ? '...' : 'Notes Doc'}
              </button>
              <button
                onClick={onEdit}
                className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-xs font-semibold text-white active:bg-[#1C2333] flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Edit
              </button>
            </div>
          </div>

          {toast && (
            <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-center">
              {toast}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#161B22] flex items-center gap-2 safe-area-bottom">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold active:bg-red-500/20 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <div className="flex-1" />
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-slate-400 rounded-lg text-xs font-semibold active:bg-[#161B22]"
            >
              Open in Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
