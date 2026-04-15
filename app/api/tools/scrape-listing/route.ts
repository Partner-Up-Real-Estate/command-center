import { NextRequest, NextResponse } from 'next/server'
import { scrapeListing } from '@/lib/listingScraper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Browser startup + page load can take time

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    // Basic URL sanity
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }
    const listing = await scrapeListing(url)
    return NextResponse.json({ listing })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scrape failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
