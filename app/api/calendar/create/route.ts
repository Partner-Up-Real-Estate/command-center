import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCalendarEvent } from '@/lib/calendar'
import { sendGmailMessage } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'
import { buildBookingConfirmationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      date,
      time,
      duration,
      attendees,
      description,
      location,
      meetingType,
      phoneNumber,
      sendConfirmation = true,
    } = body

    if (!title || !date || !time || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, time, duration' },
        { status: 400 }
      )
    }

    // Normalize attendees: accept both string[] and {email, displayName}[] formats
    const rawAttendees: string[] = (attendees || []).map((a: any) =>
      typeof a === 'string' ? a : a.email
    ).filter(Boolean)

    const event = await createCalendarEvent(session.accessToken, {
      title,
      date,
      time,
      duration,
      attendees: rawAttendees,
      description,
      location,
      meetingType,
      phoneNumber,
    })

    // Send email confirmation to all attendees + self
    if (sendConfirmation && rawAttendees.length > 0) {
      try {
        const meetLink = event.hangoutLink || undefined
        const emailHtml = buildBookingConfirmationEmail({
          title,
          date,
          time,
          duration,
          meetingType: meetingType || 'in_person',
          meetLink,
          phoneNumber: meetingType === 'phone_call' ? phoneNumber : undefined,
          location: meetingType === 'in_person' ? location : undefined,
          description,
          organizerName: session.user?.name || 'Jarrett White',
          organizerEmail: session.user?.email || 'jarrett@whiteridge.ca',
        })

        // Send to all attendees
        await sendGmailMessage(session.accessToken, {
          to: rawAttendees,
          subject: `Booking Confirmed: ${title} — ${formatDateForEmail(date)} at ${formatTimeForEmail(time)}`,
          body: emailHtml,
        })

        // Send copy to self
        const selfEmail = session.user?.email || 'jarrett@whiteridge.ca'
        if (!rawAttendees.includes(selfEmail)) {
          await sendGmailMessage(session.accessToken, {
            to: [selfEmail],
            subject: `Booking Confirmed: ${title} — ${formatDateForEmail(date)} at ${formatTimeForEmail(time)}`,
            body: emailHtml,
          })
        }
      } catch (emailErr) {
        console.error('Email confirmation failed (event still created):', emailErr)
        // Don't fail the whole request if email fails — event is already created
      }
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Create calendar event error:', error)
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
  }
}

function formatDateForEmail(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(year, month - 1, day)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${dayNames[d.getDay()]}, ${months[month - 1]} ${day}, ${year}`
}

function formatTimeForEmail(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm} HST`
}
