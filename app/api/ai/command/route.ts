import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { CommandAction } from '@/types'
import { DAILY_BLOCKS } from '@/lib/blocks'
import { searchContacts } from '@/lib/calendar'

interface CommandRequest {
  message: string
  date: string
  currentState: {
    blocks: Array<{
      id: string
      title: string
      tasks: string[]
    }>
    checklist: Record<string, boolean>
    kpis: {
      convos: number
      booked: number
    }
    scorecard: Record<number, boolean>
  }
}

interface AIResponse {
  actions: CommandAction[]
  message?: string
}

const SCORECARD_QUESTIONS = [
  'Did I generate leads?',
  'Did I convert conversations?',
  'Did I move Broki forward?',
  'Did I remove future work?',
  'Did I build relationships?',
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CommandRequest = await request.json()
    const { message, date, currentState } = body

    if (!message || !date || !currentState) {
      return NextResponse.json(
        { error: 'Missing required fields: message, date, currentState' },
        { status: 400 }
      )
    }

    // Build blocks JSON for prompt
    const blocksJson = JSON.stringify(
      currentState.blocks.map(block => ({
        id: block.id,
        title: block.title,
        tasks: block.tasks,
      })),
      null,
      2
    )

    // Build current state JSON for prompt
    const currentStateJson = JSON.stringify(
      {
        date,
        checklist: currentState.checklist,
        kpis: currentState.kpis,
        scorecard: currentState.scorecard,
      },
      null,
      2
    )

    // System prompt for Claude
    const systemPrompt = `You are the Command Center AI for Jarrett, a mortgage broker (Whiteridge) and SaaS founder (Broki). You control his Daily OS dashboard.

You can perform these actions by returning JSON:

1. Mark tasks complete:
   {"actions": [{"type": "check_tasks", "items": [{"blockId": "solo-power-hour", "taskIndex": 0}]}]}

2. Update KPIs:
   {"actions": [{"type": "update_kpi", "field": "convos", "value": 5}]}

3. Mark scorecard items:
   {"actions": [{"type": "check_scorecard", "indices": [0, 1]}]}

4. Create calendar events. If the user mentions a person by name, include their name(s) in contactQueries so we can look up their email:
   {"actions": [{"type": "create_event", "title": "Call with John Smith", "date": "2024-04-08", "time": "14:00", "duration": 30, "contactQueries": ["John Smith"]}]}
   If no specific person is mentioned, omit contactQueries. We will resolve the names to email addresses automatically.

5. Just respond with info:
   {"actions": [{"type": "message", "text": "Your response here"}]}

You can combine multiple actions. Always include a "message" action with a brief, friendly confirmation.
Today's date is ${date}. If the user says "tomorrow", calculate tomorrow's date. If they say "today" or no date, use ${date}.

Here are the Daily OS blocks and their tasks:
${blocksJson}

Scorecard questions (indices 0-4):
0: Did I generate leads?
1: Did I convert conversations?
2: Did I move Broki forward?
3: Did I remove future work?
4: Did I build relationships?

KPI fields: "convos" (conversations, target 5-15), "booked" (booked calls, target 2-5)

Current state for ${date}:
${currentStateJson}

IMPORTANT:
- Always respond with valid JSON containing an "actions" array.
- Be smart about interpreting what the user means. "I did 5 calls" → update_kpi convos to current + 5. "Finished morning block" → check all tasks in solo-power-hour.
- When creating events, always use create_event type so the user can confirm first.
- Keep message responses brief and energetic. Jarrett is busy.`

    // Call Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>
    }

    const textContent = data.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Anthropic response')
    }

    // Parse response as JSON
    let aiResponse: AIResponse
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      aiResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text, parseError)
      aiResponse = {
        actions: [
          {
            type: 'message',
            text: 'I understood your command, but had trouble processing it. Please try again with a clearer instruction.',
          },
        ],
      }
    }

    // Validate actions
    if (!Array.isArray(aiResponse.actions)) {
      aiResponse.actions = []
    }

    // Validate each action
    aiResponse.actions = aiResponse.actions.filter(action => {
      if (action.type === 'check_tasks') {
        return Array.isArray(action.items)
      } else if (action.type === 'update_kpi') {
        return (action.field === 'convos' || action.field === 'booked') && typeof action.value === 'number'
      } else if (action.type === 'check_scorecard') {
        return Array.isArray(action.indices)
      } else if (action.type === 'create_event') {
        return action.title && action.date && action.time && typeof action.duration === 'number'
      } else if (action.type === 'message') {
        return typeof action.text === 'string'
      }
      return false
    })

    // Resolve contact queries to email addresses for create_event actions
    for (const action of aiResponse.actions) {
      if (action.type === 'create_event' && (action as any).contactQueries) {
        const queries: string[] = (action as any).contactQueries
        const resolvedEmails: string[] = []
        const resolvedDetails: { name: string; email: string }[] = []

        for (const query of queries) {
          try {
            const contacts = await searchContacts(session.accessToken!, query)
            if (contacts.length > 0) {
              resolvedEmails.push(contacts[0].email)
              resolvedDetails.push({ name: contacts[0].name || query, email: contacts[0].email })
            } else {
              // No contact found — include the name the user mentioned for display
              resolvedDetails.push({ name: query, email: '' })
            }
          } catch (e) {
            console.error('Contact search failed for:', query, e)
            resolvedDetails.push({ name: query, email: '' })
          }
        }

        if (resolvedEmails.length > 0) {
          action.attendees = resolvedEmails
        }
        (action as any).attendeeDetails = resolvedDetails
        // Clean up the contactQueries field before sending to client
        delete (action as any).contactQueries
      }
    }

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error('Error processing command:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        actions: [
          {
            type: 'message',
            text: `Error: ${errorMsg}`,
          },
        ],
      },
      { status: 500 }
    )
  }
}
