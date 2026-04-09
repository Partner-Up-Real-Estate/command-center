import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// Mock data generator for posts
function generateMockPosts(accountId: string, accountHandle: string, count: number = 15) {
  const postTypes = ['reel', 'image', 'carousel', 'short']
  const posts = []

  for (let i = 0; i < count; i++) {
    const now = new Date()
    const daysAgo = Math.floor(Math.random() * 30)
    const postedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    const engagement = Math.random()
    const likes = Math.floor(Math.random() * 5000 * (0.5 + engagement))
    const comments = Math.floor(Math.random() * 500 * (0.5 + engagement))
    const views = Math.floor(Math.random() * 50000 * (0.5 + engagement * 2))

    posts.push({
      accountId,
      platformPostId: `${accountHandle}_${Date.now()}_${i}`,
      caption: `Sample post about real estate and mortgages. This is post ${i + 1} from @${accountHandle}. Check out our latest insights on property investment and financial strategies.`,
      postType: postTypes[Math.floor(Math.random() * postTypes.length)],
      likes,
      comments,
      views,
      shares: Math.floor(comments * 0.3),
      postedAt,
      engagementRate: (((likes + comments + views) / Math.max(views, 1)) * 100),
    })
  }

  return posts
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the account belongs to the user
    const account = await db.trackedAccount.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Delete existing posts for this account
    await db.trackedPost.deleteMany({
      where: { accountId },
    })

    // Generate mock posts
    const mockPosts = generateMockPosts(accountId, account.handle, 15)

    // Create new posts
    const createdPosts = await db.trackedPost.createMany({
      data: mockPosts,
    })

    // Update account's lastFetched
    await db.trackedAccount.update({
      where: { id: accountId },
      data: {
        lastFetched: new Date(),
        followerCount: Math.floor(Math.random() * 100000) + 1000,
      },
    })

    return NextResponse.json({
      success: true,
      postsAdded: createdPosts.count,
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
