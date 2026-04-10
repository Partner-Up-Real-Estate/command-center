import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchDriveFiles, getRecentDriveFiles } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 1) {
      const files = await getRecentDriveFiles(session.accessToken, 10)
      return NextResponse.json({ files })
    }

    const files = await searchDriveFiles(session.accessToken, query, 10)
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Drive search error:', error)
    return NextResponse.json({ files: [] })
  }
}
