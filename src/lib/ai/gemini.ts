import { GoogleGenerativeAI } from '@google/generative-ai'

let genai: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
    genai = new GoogleGenerativeAI(apiKey)
  }
  return genai
}

export async function callGemini(options: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  system?: string
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const client = getClient()
  const modelName = options.model || 'gemini-2.0-flash'
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options.system || undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    },
  })
  const allMessages = options.messages
  const history = allMessages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }))
  const lastMessage = allMessages[allMessages.length - 1]
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMessage.content)
  const response = result.response
  const text = response.text()
  const usage = response.usageMetadata
  return {
    content: text,
    tokensIn: usage?.promptTokenCount || 0,
    tokensOut: usage?.candidatesTokenCount || 0,
  }
}

export async function callGeminiJSON<T = unknown>(options: Parameters<typeof callGemini>[0]): Promise<T> {
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
  const client = getClient()
  const modelName = options.model || 'gemini-2.0-flash'
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options.system || undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    },
  })
  const contents = options.messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }))
  const result = await model.generateContentStream({ contents })
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })
}
