'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { DAILY_BLOCKS, CATEGORY_COLORS } from '@/lib/blocks'
import type { CalendarEvent } from '@/types'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // Full 24h

function parseBlockTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + (m || 0)
}

function formatPhone(text: string): string[] {
  const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g
  return text.match(phoneRegex) || []
}

function formatLinks(text: string): { url: string; label: string }[] {
  const urlRegex = /(https?:\/\/[^\s<>]+)/g
  const matches = text.match(urlRegex) || []
  return matches.map(url => {
    let label = 'Open Link'
    if (url.includes('zoom.us')) label = 'Join Zoom Meeting'
    else if (url.includes('meet.google')) label = 'Join Google Meet'
    else if (url.includes('teams.microsoft')) label = 'Join Teams Meeting'
    else if (url.includes('webex')) label = 'Join Webex Meeting'
    return { url, label }
  })
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({})
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchEvents = useCallback(async () => {
    if (!session?.user) return
    setIsLoading(true)
    try {
      const dateStr = format(currentWeekStart, 'yyyy-MM-dd')
      const res = await fetch(`/api/calendar/events?weekStart=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.weekEvents || data.events || {})
      }
    } catch (e) {
      console.error('Error fetching events:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentWeekStart, session])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart])
  const isCurrentWeek = useMemo(() => isSameDay(currentWeekStart, getMonday(new Date())), [currentWeekStart])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1117]">
        <div className="w-8 h-8 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (status === 'unauthenticated') return null

  return (
    <div className="flex h-screen bg-[#0D1117]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* Calendar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#161B22]">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeekStart(prev => subDays(prev, 7))} className="p-1.5 hover:bg-[#161B22] rounded-lg text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
            </button>
            <h2 className="text-sm font-semibold text-white min-w-max">
              {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </h2>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} className="p-1.5 hover:bg-[#161B22] rounded-lg text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setCurrentWeekStart(getMonday(new Date()))} className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-[#161B22] hover:bg-[#1C2333] rounded-md border border-[#30363D] transition-colors">Today</button>
            )}
          </div>
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="flex min-h-0" style={{ height: `${24 * 48 + 40}px` }}>
              {/* Time axis */}
              <div className="w-14 flex-shrink-0 border-r border-[#161B22]">
                <div className="h-10" /> {/* spacer for day headers */}
                {HOURS.map(hour => (
                  <div key={hour} className="h-12 flex items-start justify-end pr-2 pt-0.5">
                    <span className="text-[10px] text-[#484F58] font-mono">{hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="flex-1 flex divide-x divide-[#161B22]">
                {weekDays.map((day, idx) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const dayEvents = events[dateKey] || []
                  const isTodayCol = isToday(day)

                  return (
                    <div key={idx} className={`flex-1 flex flex-col min-w-[100px] ${isTodayCol ? 'bg-[#378ADD]/[0.02]' : ''}`}>
                      {/* Day header */}
                      <div className={`h-10 flex flex-col items-center justify-center border-b border-[#161B22] ${isTodayCol ? 'bg-[#378ADD]/10' : ''}`}>
                        <span className="text-[10px] text-[#484F58] uppercase">{format(day, 'EEE')}</span>
                        <span className={`text-xs font-semibold ${isTodayCol ? 'text-[#378ADD]' : 'text-white'}`}>{format(day, 'd')}</span>
                      </div>

                      {/* Time grid */}
                      <div className="relative flex-1">
                        {/* Hour lines */}
                        {HOURS.map(hour => (
                          <div key={hour} className="absolute left-0 right-0 border-t border-[#161B22]" style={{ top: `${(hour / 24) * 100}%` }} />
                        ))}

                        {/* Daily OS blocks as background */}
                        {DAILY_BLOCKS.map(block => {
                          const startMin = parseBlockTime(block.startTime)
                          const endMin = parseBlockTime(block.endTime)
                          const top = (startMin / 1440) * 100
                          const height = ((endMin - startMin) / 1440) * 100
                          return (
                            <div key={block.id} className="absolute left-0 right-0 border-l-2 opacity-40" style={{
                              top: `${top}%`, height: `${height}%`,
                              borderColor: block.color,
                              backgroundColor: block.color + '08',
                            }}>
                              <span className="text-[8px] text-slate-500 px-1 truncate block">{block.title}</span>
                            </div>
                          )
                        })}

                        {/* Real events */}
                        {dayEvents.map(event => {
                          const s = new Date(event.start)
                          const e = new Date(event.end)
                          const startMin = s.getHours() * 60 + s.getMinutes()
                          const dur = (e.getTime() - s.getTime()) / 60000
                          const top = (startMin / 1440) * 100
                          const height = Math.max((dur / 1440) * 100, 1.5)
                          return (
                            <button key={event.id} onClick={() => setSelectedEvent(event)}
                              className="absolute left-1 right-1 bg-[#378ADD] hover:bg-[#2d6ab5] text-white rounded px-1.5 py-0.5 text-left overflow-hidden border border-[#378ADD]/60 hover:border-white/40 transition-colors z-10 shadow-sm"
                              style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px' }}>
                              <div className="text-[10px] font-medium truncate">{event.title}</div>
                              <div className="text-[9px] opacity-70 truncate">{format(s, 'h:mm a')}</div>
                            </button>
                          )
                        })}

                        {/* Current time indicator */}
                        {isTodayCol && (() => {
                          const now = new Date()
                          const min = now.getHours() * 60 + now.getMinutes()
                          const top = (min / 1440) * 100
                          return <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: `${top}%` }}>
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                            <div className="flex-1 h-px bg-red-500" />
                          </div>
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50" onClick={() => setSelectedEvent(null)}>
          <div className="h-full w-full max-w-md bg-[#0D1117] border-l border-[#30363D] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-[#0D1117] border-b border-[#161B22] px-5 py-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm bg-[#378ADD] flex-shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Calendar Event</span>
                </div>
                <h2 className="text-lg font-semibold text-white">{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-[#161B22] rounded text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Date & Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                  <div>
                    <div className="text-sm text-white font-medium">{format(new Date(selectedEvent.start), 'EEEE, MMMM d, yyyy')}</div>
                    <div className="text-sm text-slate-400">{format(new Date(selectedEvent.start), 'h:mm a')} – {format(new Date(selectedEvent.end), 'h:mm a')}</div>
                  </div>
                </div>
              </div>

              {/* Join link */}
              {(selectedEvent.hangoutLink || selectedEvent.conferenceData?.entryPoints) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Join Call</h4>
                  {selectedEvent.hangoutLink && (
                    <a href={selectedEvent.hangoutLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 bg-[#378ADD]/10 border border-[#378ADD]/30 rounded-lg hover:bg-[#378ADD]/20 transition-colors group">
                      <svg className="w-5 h-5 text-[#378ADD]" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                      <span className="text-sm text-[#378ADD] font-medium group-hover:underline">Join Google Meet</span>
                    </a>
                  )}
                  {selectedEvent.conferenceData?.entryPoints?.filter(ep => ep.entryPointType === 'phone').map((ep, i) => (
                    <a key={i} href={`tel:${ep.uri?.replace('tel:', '')}`}
                      className="flex items-center gap-3 px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg hover:bg-[#1C2333] transition-colors">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" /></svg>
                      <div>
                        <div className="text-sm text-white">{ep.label || ep.uri?.replace('tel:', '')}</div>
                        {ep.pin && <div className="text-xs text-slate-400">PIN: {ep.pin}</div>}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Location */}
              {selectedEvent.location && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</h4>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                    <div className="text-sm text-white">
                      {selectedEvent.location.startsWith('http') ? (
                        <a href={selectedEvent.location} target="_blank" rel="noopener noreferrer" className="text-[#378ADD] hover:underline">{selectedEvent.location}</a>
                      ) : (
                        selectedEvent.location
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* People */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">People ({selectedEvent.attendees.length})</h4>
                  <div className="space-y-1.5">
                    {selectedEvent.attendees.map((attendee, i) => {
                      const statusColor = attendee.responseStatus === 'accepted' ? 'bg-green-500' : attendee.responseStatus === 'declined' ? 'bg-red-500' : attendee.responseStatus === 'tentative' ? 'bg-amber-500' : 'bg-slate-500'
                      const isOrganizer = attendee.email === selectedEvent.organizer?.email
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-[#161B22] rounded-lg border border-[#30363D]">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{attendee.displayName || attendee.email.split('@')[0]}</div>
                            <a href={`mailto:${attendee.email}`} className="text-xs text-[#378ADD] hover:underline truncate block">{attendee.email}</a>
                          </div>
                          {isOrganizer && <span className="text-[10px] text-slate-500 bg-[#1C2333] px-1.5 py-0.5 rounded font-medium">Organizer</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (() => {
                const links = formatLinks(selectedEvent.description)
                const phones = formatPhone(selectedEvent.description)
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</h4>
                    {links.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {links.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border border-[#30363D] rounded-lg hover:bg-[#1C2333] transition-colors text-sm text-[#378ADD] hover:underline">
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    {phones.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {phones.map((phone, i) => (
                          <a key={i} href={`tel:${phone}`}
                            className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border border-[#30363D] rounded-lg hover:bg-[#1C2333] transition-colors text-sm text-green-400">
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" /></svg>
                            {phone}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</div>
                  </div>
                )
              })()}

              {/* Open in Google Calendar */}
              {selectedEvent.htmlLink && (
                <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#1C2333] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1V1" /></svg>
                  Open in Google Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
