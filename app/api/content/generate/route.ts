import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, saveContentDayToDB } from '@/lib/supabase'

interface GenerateRequest {
  date: string
  feedback: {
    topKeywords: string[]
    avoidKeywords: string[]
    goodPerformance: number
    poorPerformance: number
    topicsSelected: number
    topicsIgnored: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateRequest = await request.json()
    const { date, feedback } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }

    // Build feedback context for the AI
    let feedbackContext = ''
    if (feedback.topicsSelected > 0 || feedback.topKeywords.length > 0) {
      feedbackContext = `\n\nLEARNING FROM PAST PERFORMANCE:
- User has selected ${feedback.topicsSelected} topics and ignored ${feedback.topicsIgnored} topics historically.
- ${feedback.goodPerformance} hooks performed well, ${feedback.poorPerformance} performed poorly.
${feedback.topKeywords.length > 0 ? `- Topics/themes the user LIKES (lean into these): ${feedback.topKeywords.join(', ')}` : ''}
${feedback.avoidKeywords.length > 0 ? `- Topics/themes the user tends to SKIP (avoid these): ${feedback.avoidKeywords.join(', ')}` : ''}
Use this data to generate better, more relevant content suggestions.`
    }

    const systemPrompt = `You are a content strategist for two businesses:

1. **Whiteridge Mortgage** — A mortgage brokerage run by Jarrett in Canada. Content should be educational, approachable, and trust-building. Target audience: first-time homebuyers, real estate investors, people refinancing.
   - INSPIRATION CREATORS: The Mortgage Pug (Instagram), TM Offs (Instagram), Nolan Matthias (Instagram)
   - Style: short punchy reels, myth-busting, rate updates, homebuyer tips, "things your bank won't tell you", lifestyle of a broker

2. **Broki Technologies** — A SaaS platform for mortgage brokers. Content should position Broki as innovative, modern, and essential for broker productivity.
   - COMPETITORS TO DIFFERENTIATE FROM: BluMortgage, MyBrokerPro, BrokerEdge, RD Mortgage Pro, Pipedrive, Monday.com
   - Style: product demos, industry pain points, "before vs after Broki", broker productivity tips, behind-the-scenes building, founder journey

Generate exactly 5 content topics for Whiteridge Mortgage and 5 for Broki Technologies.

For EACH topic, provide:
- A compelling topic title
- A brief angle/description (1 sentence)
- 5 short-form video hooks optimized for Instagram Reels / TikTok (attention-grabbing first lines, under 15 words each)
${feedbackContext}

Respond with ONLY valid JSON in this exact format:
{
  "topics": [
    {
      "brand": "whiteridge",
      "topic": "Topic title",
      "angle": "Brief angle description",
      "hooks": ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5"]
    }
  ]
}

Return exactly 10 topics total (5 whiteridge + 5 broki). Make hooks punchy, scroll-stopping, and conversational. Date: ${date}.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate today's content topics and hooks for ${date}. Make them fresh, timely, and different from generic marketing advice.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    const textContent = data.content.find((block: any) => block.type === 'text')
    if (!textContent) throw new Error('No text content in response')

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])

    // Save to Supabase
    try {
      const user = await getOrCreateUser(session.user.email!)
      await saveContentDayToDB(user.id, date, parsed.topics)
    } catch (dbErr) {
      console.error('Failed to save content to Supabase (returning data anyway):', dbErr)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Content generation error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
