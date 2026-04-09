import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCalendarEvent } from '@/lib/calendar'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, date, time, duration, attendees } = body

    if (!title || !date || !time || !duration) {
      return NextResponse.json({ error: 'Missing required fields: title, date, time, duration' }, { status: 400 })
    }

    const event = await createCalendarEvent(session.accessToken, {
      title,
      date,
      time,
      duration,
      attendees: attendees || [],
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Create calendar event error:', error)
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
  }
}
