/**
 * Configuration types for Karigar.
 *
 * These describe the shape of `karigar.config.ts` (the editable template) and the
 * runtime `~/.karigar/config.json` file written on first run. Keeping the schema in
 * one place lets every command share strongly-typed settings.
 */

export type ModelProvider = 'ollama' | 'openai-compatible' | 'remote'

export interface ModelConfig {
  /** Which backend serves the model. Phase 3 wires these up; for now metadata only. */
  provider: ModelProvider
  /** Model identifier, e.g. "qwen2.5-coder:14b". */
  name: string
  /** Base URL of the inference server (Ollama defaults to http://localhost:11434). */
  baseUrl: string
  /** Optional API key for hosted/remote providers. Never commit real keys. */
  apiKey?: string
  /** Sampling temperature. Lower = more deterministic, better for code. */
  temperature: number
  /** Upper bound on generated tokens per response. */
  maxTokens: number
}

export interface ContextConfig {
  /** Max number of files Karigar will inject via `@file` context (Phase 2). */
  maxFiles: number
  /** Whether to include `git diff` output when building context. */
  includeGitDiff: boolean
}

export interface UiConfig {
  /** Colorize output (disable for plain logs / CI). */
  color: boolean
  /** Show spinners during long operations. */
  spinner: boolean
  /** Stream model output token-by-token rather than buffering. */
  streaming: boolean
}

export interface KarigarConfig {
  model: ModelConfig
  context: ContextConfig
  ui: UiConfig
}

/** A user-supplied override — every field is optional and merged over defaults. */
export type PartialKarigarConfig = {
  [K in keyof KarigarConfig]?: Partial<KarigarConfig[K]>
}
