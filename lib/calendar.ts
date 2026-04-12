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

export type MeetingType = 'in_person' | 'google_meet' | 'phone_call'

export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string
    date: string
    time: string
    duration: number
    attendees?: string[]
    description?: string
    location?: string
    meetingType?: MeetingType
    phoneNumber?: string
  }
): Promise<CalendarEvent> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth })

    const [hours, minutes] = event.time.split(':').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    const startISO = `${event.date}T${pad(hours)}:${pad(minutes || 0)}:00-10:00`
    const startDateTime = new Date(startISO)
    const endDateTime = new Date(startDateTime.getTime() + event.duration * 60 * 1000)

    const requestBody: any = {
      summary: event.title,
      description: event.description,
      start: { dateTime: startDateTime.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: endDateTime.toISOString(), timeZone: TIMEZONE },
    }

    // Handle meeting type
    if (event.meetingType === 'google_meet') {
      requestBody.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    } else if (event.meetingType === 'phone_call') {
      const phoneNote = event.phoneNumber
        ? `📞 Phone call\nDial: ${event.phoneNumber}`
        : '📞 Phone call'
      requestBody.description = [phoneNote, event.description].filter(Boolean).join('\n\n')
      if (event.phoneNumber && !event.location) {
        requestBody.location = event.phoneNumber
      }
    }

    if (event.location && !requestBody.location) {
      requestBody.location = event.location
    }

    if (event.attendees && event.attendees.length > 0) {
      requestBody.attendees = event.attendees.map(email => ({ email }))
      requestBody.sendUpdates = 'all'
    }

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody,
      conferenceDataVersion: event.meetingType === 'google_meet' ? 1 : undefined,
      sendUpdates: event.attendees && event.attendees.length > 0 ? 'all' : undefined,
    })
    return mapEvent(response.data)
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

export interface Contact {
  name: string
  email: string
  photoUrl?: string
  phone?: string
  source?: 'contacts' | 'other' | 'directory' | 'gmail'
}

export interface ContactSearchResult {
  contacts: Contact[]
  errors: { source: string; status: number; message: string }[]
  needsReauth: boolean
}

async function fetchJsonSafe(url: string, headers: Record<string, string>) {
  try {
    const r = await fetch(url, { headers })
    const text = await r.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    return { ok: r.ok, status: r.status, data, raw: text }
  } catch (e: any) {
    return { ok: false, status: 0, data: null, raw: e?.message || 'network_error' }
  }
}

export async function searchContacts(
  accessToken: string,
  query: string
): Promise<ContactSearchResult> {
  const result: ContactSearchResult = { contacts: [], errors: [], needsReauth: false }
  if (!query || query.trim().length < 1) return result

  const q = encodeURIComponent(query.trim())
  const qLower = query.trim().toLowerCase()
  const headers = { Authorization: `Bearer ${accessToken}` }
  const readMask = 'names,emailAddresses,photos,phoneNumbers'

  const seen = new Set<string>()
  const addContact = (c: Contact) => {
    const key = c.email.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.contacts.push(c)
  }

  const addFromPeopleResponse = (data: any, source: Contact['source']) => {
    const items = data?.results || data?.people || []
    for (const r of items) {
      const person = r.person || r
      const emails = person?.emailAddresses || []
      if (!emails.length) continue
      const email = emails[0].value
      if (!email) continue
      addContact({
        name: person.names?.[0]?.displayName || email.split('@')[0],
        email,
        photoUrl: person.photos?.[0]?.url,
        phone: person.phoneNumbers?.[0]?.value,
        source,
      })
    }
  }

  const recordError = (source: string, status: number, data: any) => {
    const message =
      data?.error?.message || data?.error_description || `HTTP ${status}`
    result.errors.push({ source, status, message })
    console.error(`[searchContacts] ${source} failed:`, status, message)
    if (
      status === 401 ||
      status === 403 ||
      /insufficient|PERMISSION_DENIED|invalid_scope|invalid credentials/i.test(
        message
      )
    ) {
      result.needsReauth = true
    }
  }

  // 1. Primary contacts (saved)
  const primary = await fetchJsonSafe(
    `https://people.googleapis.com/v1/people:searchContacts?query=${q}&readMask=${readMask}&pageSize=15`,
    headers
  )
  if (primary.ok) addFromPeopleResponse(primary.data, 'contacts')
  else recordError('people:searchContacts', primary.status, primary.data)

  // 2. Other contacts (people you've emailed but not saved)
  const other = await fetchJsonSafe(
    `https://people.googleapis.com/v1/otherContacts:search?query=${q}&readMask=names,emailAddresses,photos&pageSize=15`,
    headers
  )
  if (other.ok) addFromPeopleResponse(other.data, 'other')
  else recordError('otherContacts:search', other.status, other.data)

  // 3. Directory (Google Workspace)
  const directory = await fetchJsonSafe(
    `https://people.googleapis.com/v1/people:searchDirectoryPeople?query=${q}&readMask=${readMask}&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE&pageSize=15`,
    headers
  )
  if (directory.ok) addFromPeopleResponse(directory.data, 'directory')
  else recordError('people:searchDirectoryPeople', directory.status, directory.data)

  // 4. Gmail fallback — parse From/To headers of recent messages matching the query.
  //    This is the most reliable source for "people I've emailed/been emailed by"
  //    and works even if People API scopes are incomplete (only needs gmail.readonly).
  try {
    const gmailSearch = await fetchJsonSafe(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
        `from:${query.trim()} OR to:${query.trim()}`
      )}&maxResults=15`,
      headers
    )
    if (gmailSearch.ok && gmailSearch.data?.messages?.length) {
      const msgIds: string[] = gmailSearch.data.messages.map((m: any) => m.id)
      const metas = await Promise.all(
        msgIds.slice(0, 10).map(id =>
          fetchJsonSafe(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc`,
            headers
          )
        )
      )
      const emailRe = /([^<,\s"']+@[^>,\s"']+)/g
      const nameRe = /^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/
      for (const m of metas) {
        if (!m.ok) {
          if (m.status === 401 || m.status === 403) {
            recordError('gmail:messages.get', m.status, m.data)
          }
          continue
        }
        const headersArr = m.data?.payload?.headers || []
        for (const h of headersArr) {
          if (!['From', 'To', 'Cc'].includes(h.name)) continue
          const raw: string = h.value || ''
          // Split by comma (but not inside quotes/brackets)
          const parts = raw.split(/,(?![^<]*>)/)
          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed) continue
            const nameMatch = trimmed.match(nameRe)
            let name = ''
            let email = ''
            if (nameMatch) {
              name = nameMatch[1].trim()
              email = nameMatch[2].trim()
            } else {
              const em = trimmed.match(emailRe)
              if (em) email = em[0]
            }
            if (!email) continue
            // Match query against either name or email
            if (
              !email.toLowerCase().includes(qLower) &&
              !name.toLowerCase().includes(qLower)
            )
              continue
            addContact({
              name: name || email.split('@')[0],
              email,
              source: 'gmail',
            })
          }
        }
      }
    } else if (!gmailSearch.ok && (gmailSearch.status === 401 || gmailSearch.status === 403)) {
      recordError('gmail:messages.list', gmailSearch.status, gmailSearch.data)
    }
  } catch (e: any) {
    console.error('[searchContacts] gmail fallback error:', e?.message)
  }

  // Rank: exact match first, then name match, then email match
  result.contacts.sort((a, b) => {
    const ae = a.email.toLowerCase()
    const be = b.email.toLowerCase()
    const an = (a.name || '').toLowerCase()
    const bn = (b.name || '').toLowerCase()
    const aScore =
      (ae === qLower ? 100 : 0) +
      (an.startsWith(qLower) ? 50 : 0) +
      (ae.startsWith(qLower) ? 30 : 0) +
      (an.includes(qLower) ? 10 : 0) +
      (ae.includes(qLower) ? 5 : 0)
    const bScore =
      (be === qLower ? 100 : 0) +
      (bn.startsWith(qLower) ? 50 : 0) +
      (be.startsWith(qLower) ? 30 : 0) +
      (bn.includes(qLower) ? 10 : 0) +
      (be.includes(qLower) ? 5 : 0)
    return bScore - aScore
  })

  result.contacts = result.contacts.slice(0, 20)
  return result
}

// Warm the contacts cache — Google requires calling searchContacts with empty query
// to populate the cache before first real search. Call on mount.
export async function warmContactsCache(accessToken: string): Promise<void> {
  try {
    await Promise.all([
      fetch(
        'https://people.googleapis.com/v1/people:searchContacts?query=&readMask=names,emailAddresses&pageSize=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      fetch(
        'https://people.googleapis.com/v1/otherContacts:search?query=&readMask=names,emailAddresses&pageSize=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
    ])
  } catch {
    /* ignore */
  }
}
