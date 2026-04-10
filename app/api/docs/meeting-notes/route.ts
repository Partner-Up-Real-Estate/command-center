import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createMeetingNotesDoc } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, attendees, agenda } = body

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const doc = await createMeetingNotesDoc(session.accessToken, { title, attendees, agenda })
    if (!doc) {
      return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 })
    }
    return NextResponse.json({ doc })
  } catch (error) {
    console.error('Create meeting notes error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
