import type { KarigarConfig } from '../config/types'
import type { ModelClient } from './types'
import { OllamaProvider } from './providers/ollama'

export function createModelClient(config: KarigarConfig): ModelClient {
  const { provider } = config.model
  if (provider === 'ollama') return new OllamaProvider(config.model)
  // Phase 5: remote and openai-compatible providers land here.
  throw new Error(
    `Provider "${provider}" is not yet supported. Set model.provider to "ollama" in ~/.karigar/config.json.`,
  )
}
