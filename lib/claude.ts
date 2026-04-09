const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function generateHooks(captions: string[]): Promise<string[]> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const captionsText = captions.join('\n---\n')

  const prompt = `You are a social media expert and copywriter specializing in converting educational content about mortgages, real estate investing, and financial strategy into viral short-form hooks.

Your task: Generate multiple compelling hooks (attention-grabbing opening lines) for short-form video content based on the following captions. Each hook should:
- Be 5-15 words maximum
- Grab attention immediately
- Be specific and benefit-driven
- Use pattern interrupts (questions, contrasts, bold claims)
- Match the tone and topic of the original caption

Captions to generate hooks for:
${captionsText}

Return ONLY the hooks, one per line, in the same order as the captions. No numbering, no explanations, no extra text.`

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>
  }

  const textContent = data.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Anthropic response')
  }

  const hooks = textContent.text
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0)

  return hooks
}
