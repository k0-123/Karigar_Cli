import type { KarigarConfig } from '../config/types'
import type { ModelClient, ModelRequest, Token } from './types'
import type { Tier } from '../classifier/tier'
import { OllamaProvider } from './providers/ollama'
import { OpenAICompatibleProvider } from './providers/openai-compatible'
import { RemoteProvider } from './providers/remote'

class FallbackClient implements ModelClient {
  constructor(
    private readonly primary: ModelClient,
    private readonly fallback: ModelClient,
  ) {}

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    try {
      for await (const token of this.primary.chat(request)) {
        yield token
      }
    } catch {
      yield* this.fallback.chat(request)
    }
  }
}

export function createModelClient(config: KarigarConfig, tier: Tier = 'medium'): ModelClient {
  const { provider } = config.model

  if (provider === 'ollama') return new OllamaProvider(config.model)

  if (provider === 'openai-compatible') return new OpenAICompatibleProvider(config.model)

  if (provider === 'remote') {
    const remote = new RemoteProvider(config.model).withTier(tier)
    const local = new OllamaProvider({ ...config.model, baseUrl: 'http://localhost:11434' })
    // Remote first, silent fallback to local Ollama if server is unreachable
    return new FallbackClient(remote, local)
  }

  throw new Error(
    `Unknown provider "${provider}". Valid values: ollama, openai-compatible, remote`,
  )
}
