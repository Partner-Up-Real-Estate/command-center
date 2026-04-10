import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchContacts, warmContactsCache } from '@/lib/calendar'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const warm = searchParams.get('warm')

    if (warm === '1') {
      await warmContactsCache(session.accessToken)
      return NextResponse.json({ warmed: true })
    }

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ contacts: [], results: [] })
    }

    const contacts = await searchContacts(session.accessToken, query)
    // Return both `contacts` and `results` for backward compat
    return NextResponse.json({ contacts, results: contacts })
  } catch (error) {
    console.error('Contact search error:', error)
    return NextResponse.json({ contacts: [], results: [] })
  }
}
