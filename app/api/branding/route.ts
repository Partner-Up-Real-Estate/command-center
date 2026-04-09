import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, getBrandingFromDB, saveBrandingToDB } from '@/lib/supabase'

// GET /api/branding — fetch branding config
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)
    const branding = await getBrandingFromDB(user.id)

    return NextResponse.json(branding || {
      platformName: 'Whiteridge',
      subtitle: 'Command Center',
      logoUrl: null,
      accentColor: '#378ADD',
    })
  } catch (error) {
    console.error('GET /api/branding error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/branding — save branding config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platformName, subtitle, logoUrl, accentColor } = body

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image)
    await saveBrandingToDB(user.id, { platformName, subtitle, logoUrl, accentColor })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/branding error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
