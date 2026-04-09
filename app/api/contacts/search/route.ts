import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchContacts } from '@/lib/calendar'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get('q')
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const contacts = await searchContacts(session.accessToken, query)
    return NextResponse.json({ results: contacts })
  } catch (error) {
    console.error('Contact search error:', error)
    return NextResponse.json({ results: [] })
  }
}
