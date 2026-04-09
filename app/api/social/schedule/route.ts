import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/social/schedule — list scheduled posts
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const scheduled = await db.post.findMany({
    where: { userId: user.id, status: 'scheduled' },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json({ posts: scheduled })
}

// DELETE /api/social/schedule — cancel a scheduled post
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await db.post.deleteMany({ where: { id, userId: user.id, status: 'scheduled' } })
  return NextResponse.json({ success: true })
}
