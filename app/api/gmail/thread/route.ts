import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGmailThreadWithContact, searchGmailMessages } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const query = searchParams.get('q')

    if (email) {
      const messages = await getGmailThreadWithContact(session.accessToken, email, 5)
      return NextResponse.json({ messages })
    }
    if (query) {
      const messages = await searchGmailMessages(session.accessToken, query, 10)
      return NextResponse.json({ messages })
    }
    return NextResponse.json({ messages: [] })
  } catch (error) {
    console.error('Gmail thread error:', error)
    return NextResponse.json({ messages: [] })
  }
}
