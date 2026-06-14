/**
 * karigar.config.ts — editable configuration template.
 *
 * This file documents every available setting with its default value. The running
 * CLI reads its effective config from `~/.karigar/config.json` (seeded on first run
 * from `src/config/defaults.ts`); copy values from here to customize. In later phases
 * Karigar will also load overrides directly from a project-local config like this one.
 *
 * Security: do NOT commit real API keys here. Prefer the `apiKey` field in your local
 * `~/.karigar/config.json` (git-ignored by default) or an environment variable.
 */
import type { KarigarConfig } from './src/config/types'

const config: KarigarConfig = {
  model: {
    provider: 'ollama', // 'ollama' | 'openai-compatible' | 'remote'
    name: 'qwen2.5-coder:14b',
    baseUrl: 'http://localhost:11434',
    // apiKey: process.env.KARIGAR_API_KEY,
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
}

export default config
