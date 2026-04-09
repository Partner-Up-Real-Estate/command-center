import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/growth/hooks — list saved hooks
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ hooks: [] })

  const hooks = await db.hook.findMany({
    where: { userId: user.id },
    orderBy: { generatedAt: 'desc' },
  })

  return NextResponse.json({ hooks })
}

// POST /api/growth/hooks — save a hook
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, label } = await req.json()
  if (!text) return NextResponse.json({ error: 'Hook text required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const hook = await db.hook.create({
    data: { userId: user.id, text, label: label || null },
  })

  return NextResponse.json({ hook }, { status: 201 })
}

// DELETE /api/growth/hooks — delete a hook
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Hook ID required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await db.hook.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ success: true })
}
