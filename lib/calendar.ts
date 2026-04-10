import { google } from 'googleapis'
import { CalendarEvent } from '@/types'

const CALENDAR_ID = 'jarrett@whiteridge.ca'
const TIMEZONE = 'Pacific/Honolulu'

// Build an ISO datetime string for a YYYY-MM-DD date at a given hour in Hawaii time.
// Google Calendar API accepts timezone-aware RFC3339 strings.
function hawaiiDatetime(dateStr: string, hour: number, minute = 0, second = 0): string {
  // Hawaii is always UTC-10 (no DST)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateStr}T${pad(hour)}:${pad(minute)}:${pad(second)}-10:00`
}

// Convert a Date or dateTime string from Google into a Hawaii YYYY-MM-DD key
function toHawaiiDateKey(dateTime?: string | null, dateOnly?: string | null): string {
  if (dateOnly) return dateOnly // all-day events are already a date string
  if (!dateTime) return ''
  // Convert to Hawaii time by formatting with the timezone
  const d = new Date(dateTime)
  // Use Intl to get the correct Hawaii date parts
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  return parts // returns YYYY-MM-DD in en-CA locale
}

function mapEvent(event: any): CalendarEvent {
  return {
    id: event.id || '',
    title: event.summary || 'Untitled',
    start: event.start?.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start?.date || ''),
    end: event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end?.date || ''),
    color: event.colorId,
    description: event.description,
    location: event.location,
    attendees: event.attendees?.map((a: any) => ({
      email: a.email || '',
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    hangoutLink: event.hangoutLink,
    conferenceData: event.conferenceData as any,
    creator: event.creator as any,
    organizer: event.organizer as any,
    htmlLink: event.htmlLink,
  }
}

export async function getCalendarEvents(
  accessToken: string,
  date: Date
): Promise<CalendarEvent[]> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth })

    // Use the date string (YYYY-MM-DD) and build Hawaii-anchored boundaries
    const dateStr = date.toISOString().split('T')[0]
    const timeMin = hawaiiDatetime(dateStr, 0)
    const timeMax = hawaiiDatetime(dateStr, 23, 59, 59)

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return (response.data.items || []).map(mapEvent)
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }
}

export async function getWeekEvents(
  accessToken: string,
  weekStart: Date
): Promise<Record<string, CalendarEvent[]>> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth })

    const startStr = weekStart.toISOString().split('T')[0]
    // End of week = weekStart + 6 days
    const endDate = new Date(weekStart)
    endDate.setDate(endDate.getDate() + 6)
    const endStr = endDate.toISOString().split('T')[0]

    const timeMin = hawaiiDatetime(startStr, 0)
    const timeMax = hawaiiDatetime(endStr, 23, 59, 59)

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    const groupedByDay: Record<string, CalendarEvent[]> = {}

    events.forEach((event) => {
      const dateKey = toHawaiiDateKey(event.start?.dateTime, event.start?.date)
      if (!dateKey) return

      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = []
      }

      groupedByDay[dateKey].push(mapEvent(event))
    })

    return groupedByDay
  } catch (error) {
    console.error('Error fetching week events:', error)
    return {}
  }
}

export async function createCalendarEvent(
  accessToken: string,
  event: { title: string; date: string; time: string; duration: number; attendees?: string[] }
): Promise<CalendarEvent> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth })

    const [hours, minutes] = event.time.split(':').map(Number)
    const startDateTime = new Date(`${event.date}T${String(hours).padStart(2,'0')}:${String(minutes||0).padStart(2,'0')}:00`)
    const endDateTime = new Date(startDateTime.getTime() + event.duration * 60 * 1000)

    const requestBody: any = {
      summary: event.title,
      start: { dateTime: startDateTime.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: endDateTime.toISOString(), timeZone: TIMEZONE },
    }

    if (event.attendees && event.attendees.length > 0) {
      requestBody.attendees = event.attendees.map(email => ({ email }))
      requestBody.sendUpdates = 'all'
    }

    const response = await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody })
    const e = response.data

    return {
      id: e.id || '',
      title: e.summary || 'Untitled',
      start: new Date(e.start?.dateTime || ''),
      end: new Date(e.end?.dateTime || ''),
      color: e.colorId ?? undefined,
      description: e.description ?? undefined,
      location: e.location ?? undefined,
      attendees: e.attendees?.map(a => ({ email: a.email || '', displayName: a.displayName ?? undefined, responseStatus: a.responseStatus ?? undefined })),
      hangoutLink: e.hangoutLink ?? undefined,
      htmlLink: e.htmlLink ?? undefined,
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: { title?: string; date?: string; time?: string; duration?: number; description?: string; location?: string }
): Promise<CalendarEvent> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth })

  // Fetch existing event first
  const existing = await calendar.events.get({ calendarId: CALENDAR_ID, eventId })
  const body: any = { ...existing.data }

  if (updates.title !== undefined) body.summary = updates.title
  if (updates.description !== undefined) body.description = updates.description
  if (updates.location !== undefined) body.location = updates.location

  if (updates.date && updates.time) {
    const [hours, minutes] = updates.time.split(':').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    const startISO = `${updates.date}T${pad(hours)}:${pad(minutes || 0)}:00-10:00`
    const startDt = new Date(startISO)
    const dur = updates.duration ?? (
      existing.data.start?.dateTime && existing.data.end?.dateTime
        ? (new Date(existing.data.end.dateTime).getTime() - new Date(existing.data.start.dateTime).getTime()) / 60000
        : 60
    )
    const endDt = new Date(startDt.getTime() + dur * 60 * 1000)
    body.start = { dateTime: startDt.toISOString(), timeZone: TIMEZONE }
    body.end = { dateTime: endDt.toISOString(), timeZone: TIMEZONE }
  } else if (updates.duration && existing.data.start?.dateTime) {
    const startDt = new Date(existing.data.start.dateTime)
    const endDt = new Date(startDt.getTime() + updates.duration * 60 * 1000)
    body.end = { dateTime: endDt.toISOString(), timeZone: TIMEZONE }
  }

  const response = await calendar.events.update({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: body,
  })
  return mapEvent(response.data)
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId })
}

export async function searchContacts(accessToken: string, query: string): Promise<{ name: string; email: string }[]> {
  try {
    const res = await fetch(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses&pageSize=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || [])
      .filter((r: any) => r.person?.emailAddresses?.length)
      .map((r: any) => ({
        name: r.person.names?.[0]?.displayName || '',
        email: r.person.emailAddresses[0].value,
      }))
  } catch {
    return []
  }
}
