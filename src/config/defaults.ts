import type { KarigarConfig } from './types'

export const defaultConfig: KarigarConfig = {
  model: {
    provider: 'ollama',
    name: 'qwen2.5-coder:14b',
    baseUrl: 'http://localhost:11434',
    temperature: 0.2,
    maxTokens: 2048,
  },
  context: {
    maxFiles: 20,
    includeGitDiff: true,
  },
  ui: {
    color: true,
    spinner: true,
    streaming: true,
  },
  fleet: [],
}
