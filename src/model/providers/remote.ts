import type { ModelClient, ModelRequest, Token } from '../types'
import type { ModelConfig } from '../../config/types'
import type { Tier } from '../../classifier/tier'

interface RemoteRequest {
  messages: ModelRequest['messages']
  tier: Tier
  model?: string
  temperature?: number
  maxTokens?: number
}

export class RemoteProvider implements ModelClient {
  private tier: Tier = 'medium'

  constructor(private readonly cfg: ModelConfig) {}

  withTier(tier: Tier): this {
    this.tier = tier
    return this
  }

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    const url = `${this.cfg.baseUrl}/v1/chat`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    // Server-issued token stored in config (no user-facing API key)
    if (this.cfg.apiKey) headers['X-Karigar-Token'] = this.cfg.apiKey

    const body: RemoteRequest = {
      messages: request.messages,
      tier: this.tier,
      temperature: request.temperature ?? this.cfg.temperature,
      maxTokens: request.maxTokens ?? this.cfg.maxTokens,
    }

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      })
    } catch (err) {
      throw new Error(
        `Cannot reach Karigar server at ${this.cfg.baseUrl}. Falling back to local Ollama.`,
      )
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`)
    }

    // Remote server streams the same NDJSON format as Ollama for simplicity
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from remote server')

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
        if (!trimmed) continue
        const chunk = JSON.parse(trimmed) as { text: string; done: boolean }
        yield { text: chunk.text, done: chunk.done }
        if (chunk.done) return
      }
    }
  }
}
