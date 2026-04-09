import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateHooks } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await request.json()

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get posts for analysis
    let posts = []

    if (accountId) {
      // Get posts for specific account
      posts = await db.trackedPost.findMany({
        where: {
          accountId,
        },
        take: 20,
        orderBy: {
          postedAt: 'desc',
        },
      })
    } else {
      // Get top posts from all accounts
      posts = await db.trackedPost.findMany({
        where: {
          account: {
            userId: user.id,
          },
        },
        take: 20,
        orderBy: {
          engagementRate: 'desc',
        },
      })
    }

    if (posts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found to generate hooks from' },
        { status: 400 }
      )
    }

    // Extract captions
    const captions = posts
      .filter((p) => p.caption)
      .map((p) => p.caption!)

    if (captions.length === 0) {
      return NextResponse.json(
        { error: 'No captions found to generate hooks from' },
        { status: 400 }
      )
    }

    try {
      // Generate hooks using Claude API
      const hooks = await generateHooks(captions)
      return NextResponse.json({ hooks })
    } catch (error) {
      // If API fails, return mock hooks
      console.error('Claude API error:', error)

      const mockHooks = [
        'Mortgage rates just dropped - Here\'s what it means for you',
        'The one mortgage mistake costing you $10K+ annually',
        'Why most first-time buyers are getting this wrong',
        'How to qualify for better mortgage rates in 2024',
        'The mortgage hack nobody talks about',
      ]

      return NextResponse.json({ hooks: mockHooks })
    }
  } catch (error) {
    console.error('Error generating hooks:', error)
    return NextResponse.json({ error: 'Failed to generate hooks' }, { status: 500 })
  }
}
