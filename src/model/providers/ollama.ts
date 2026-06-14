import type { ModelClient, ModelRequest, Token } from '../types'
import type { ModelConfig } from '../../config/types'

interface OllamaChunk {
  message?: { content?: string }
  done: boolean
}

export class OllamaProvider implements ModelClient {
  constructor(private readonly cfg: ModelConfig) {}

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    const url = `${this.cfg.baseUrl}/api/chat`
    const body = JSON.stringify({
      model: this.cfg.name,
      messages: request.messages,
      stream: true,
      options: {
        temperature: request.temperature ?? this.cfg.temperature,
        num_predict: request.maxTokens ?? this.cfg.maxTokens,
      },
    })

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Free ngrok tunnels serve a browser-warning interstitial unless this
          // header is present; harmless when talking to a local Ollama.
          'ngrok-skip-browser-warning': 'true',
        },
        body,
      })
    } catch (err) {
      throw new Error(
        `Cannot reach Ollama at ${this.cfg.baseUrl}. Is it running? (ollama serve)`,
      )
    }

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}: ${await res.text()}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from Ollama')

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
        const chunk = JSON.parse(trimmed) as OllamaChunk
        const text = chunk.message?.content ?? ''
        yield { text, done: chunk.done }
        if (chunk.done) return
      }
    }
  }
}
