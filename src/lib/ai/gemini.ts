import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
    client = new Anthropic({ apiKey })
  }
  return client
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export async function callGemini(options: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  system?: string
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    system: options.system || undefined,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    content: text,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  }
}

export async function callGeminiJSON<T = unknown>(
  options: Parameters<typeof callGemini>[0]
): Promise<T> {
  const response = await callGemini(options)
  let content = response.content.trim()
  if (content.startsWith('```json')) content = content.slice(7)
  else if (content.startsWith('```')) content = content.slice(3)
  if (content.endsWith('```')) content = content.slice(0, -3)
  content = content.trim()
  return JSON.parse(content) as T
}

export async function streamGemini(options: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  system?: string
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<ReadableStream> {
  const anthropic = getClient()
  const encoder = new TextEncoder()

  const stream = anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    system: options.system || undefined,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            if (text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', text })}\n\n`
                )
              )
            }
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`
          )
        )
      } finally {
        controller.close()
      }
    },
  })
}
