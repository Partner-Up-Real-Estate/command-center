import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendGmailMessage, createGmailDraft } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, cc, bcc, subject, body: emailBody, draft, threadId, inReplyTo } = body

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 })
    }
    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body required' }, { status: 400 })
    }

    if (draft) {
      const result = await createGmailDraft(session.accessToken, { to, subject, body: emailBody })
      return NextResponse.json({ success: true, draft: result })
    }

    const result = await sendGmailMessage(session.accessToken, {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      threadId,
      inReplyTo,
    })
    return NextResponse.json({ success: true, message: result })
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
