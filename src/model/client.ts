import type { KarigarConfig } from '../config/types'
import type { ModelClient, ModelRequest, Token } from './types'
import type { Tier } from '../classifier/tier'
import { OllamaProvider } from './providers/ollama'
import { OpenAICompatibleProvider } from './providers/openai-compatible'
import { FleetProvider } from './providers/fleet'

class FallbackClient implements ModelClient {
  constructor(
    private readonly primary: ModelClient,
    private readonly fallback: ModelClient,
    private readonly primaryLabel = 'primary',
  ) {}

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    try {
      for await (const token of this.primary.chat(request)) {
        yield token
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`\n⚠  ${this.primaryLabel} unavailable (${msg}) — falling back to local Ollama.`)
      yield* this.fallback.chat(request)
    }
  }
}

export function createModelClient(
  config: KarigarConfig,
  tier: Tier = 'medium',
  modelOverride?: string | null,
): ModelClient {
  const { provider } = config.model

  // If there are fleet nodes configured, use them directly (no Render hop).
  // Falls back to local Ollama if every node is down.
  if (config.fleet && config.fleet.length > 0) {
    const fleet = new FleetProvider(config.fleet).withTier(tier)
    if (modelOverride) fleet.withModel(modelOverride)
    const localCfg = modelOverride
      ? { ...config.model, name: modelOverride, baseUrl: 'http://localhost:11434' }
      : { ...config.model, baseUrl: 'http://localhost:11434' }
    const local = new OllamaProvider(localCfg)
    return new FallbackClient(fleet, local, 'Fleet')
  }

  const baseModel = modelOverride ? { ...config.model, name: modelOverride } : config.model

  if (provider === 'ollama') return new OllamaProvider(baseModel)

  if (provider === 'openai-compatible') return new OpenAICompatibleProvider(baseModel)

  // Legacy remote provider (ngrok URL stored as model.baseUrl via `karigar connect`).
  if (provider === 'remote') {
    const remote = new OllamaProvider(baseModel)
    const local = new OllamaProvider({ ...baseModel, baseUrl: 'http://localhost:11434' })
    return new FallbackClient(remote, local, 'Remote provider')
  }

  throw new Error(
    `Unknown provider "${provider}". Valid values: ollama, openai-compatible, remote`,
  )
}
