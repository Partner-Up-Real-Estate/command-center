import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, getDayStateFromDB, saveDayStateToDB } from '@/lib/supabase'

// GET /api/state?date=YYYY-MM-DD — fetch day state
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const date = request.nextUrl.searchParams.get('date')
    if (!date) {
      return NextResponse.json({ error: 'Missing date param' }, { status: 400 })
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)
    const state = await getDayStateFromDB(user.id, date)

    return NextResponse.json(state)
  } catch (error) {
    console.error('GET /api/state error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/state — save day state
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, checklist, scorecard, kpis } = body

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 })
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)
    await saveDayStateToDB(user.id, date, { checklist, scorecard, kpis })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/state error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
