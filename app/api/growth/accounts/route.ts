import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tracked accounts
    const accounts = await db.trackedAccount.findMany({
      where: { userId: user.id },
    })

    // Get posts for all accounts
    const posts = await db.trackedPost.findMany({
      where: {
        account: {
          userId: user.id,
        },
      },
      include: {
        account: true,
      },
    })

    return NextResponse.json({
      accounts,
      posts,
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, handle } = await request.json()

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'Platform and handle are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upsert tracked account
    const account = await db.trackedAccount.upsert({
      where: {
        userId_platform_handle: {
          userId: user.id,
          platform,
          handle,
        },
      },
      update: {
        lastFetched: new Date(),
      },
      create: {
        userId: user.id,
        platform,
        handle,
        displayName: handle,
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
