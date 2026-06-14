import type { ModelClient, ModelRequest, Token } from '../types'
import type { ModelConfig } from '../../config/types'

interface OpenAIDelta {
  content?: string
}

interface OpenAIChoice {
  delta: OpenAIDelta
  finish_reason: string | null
}

interface OpenAIChunk {
  choices: OpenAIChoice[]
}

export class OpenAICompatibleProvider implements ModelClient {
  constructor(private readonly cfg: ModelConfig) {}

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    const url = `${this.cfg.baseUrl}/chat/completions`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.cfg.apiKey) headers['Authorization'] = `Bearer ${this.cfg.apiKey}`

    const body = JSON.stringify({
      model: this.cfg.name,
      messages: request.messages,
      stream: true,
      temperature: request.temperature ?? this.cfg.temperature,
      max_tokens: request.maxTokens ?? this.cfg.maxTokens,
    })

    let res: Response
    try {
      res = await fetch(url, { method: 'POST', headers, body })
    } catch {
      throw new Error(`Cannot reach OpenAI-compatible endpoint at ${this.cfg.baseUrl}`)
    }

    if (!res.ok) {
      throw new Error(`Endpoint returned HTTP ${res.status}: ${await res.text()}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from endpoint')

    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      const lines = buf.split('\n')
      buf = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        const chunk = JSON.parse(trimmed.slice(6)) as OpenAIChunk
        const choice = chunk.choices[0]
        if (!choice) continue

        const text = choice.delta.content ?? ''
        const isDone = choice.finish_reason !== null
        yield { text, done: isDone }
        if (isDone) return
      }
    }
  }
}
