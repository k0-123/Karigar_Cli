export type ModelProvider = 'ollama' | 'openai-compatible' | 'remote'

export type WorkerProvider =
  | 'colab'
  | 'kaggle'
  | 'oracle-arm'
  | 'lightning-gpu'
  | 'lightning-cpu'

/**
 * One worker in the direct fleet. The CLI health-checks each node, picks the
 * fastest healthy one, and streams directly from its Ollama — no server hop.
 */
export interface FleetNode {
  id: string
  provider: WorkerProvider
  /** Public ngrok/tunnel URL pointing at raw Ollama (port 11434). */
  baseUrl: string
  /** Short model used for fast/casual prompts (≤8 words, no code). */
  fastModel: string
  /** Heavier model used for coding/medium/complex prompts. */
  codingModel: string
  /** Highest tier this node handles. */
  tier: 'fast' | 'medium' | 'complex'
}

export interface ModelConfig {
  provider: ModelProvider
  name: string
  baseUrl: string
  apiKey?: string
  temperature: number
  maxTokens: number
}

export interface ContextConfig {
  maxFiles: number
  includeGitDiff: boolean
}

export interface UiConfig {
  color: boolean
  spinner: boolean
  streaming: boolean
  /** Visual theme for the home screen. 'artisan' = full dashboard look. */
  theme?: 'artisan' | 'plain'
  /** When false, the REPL skips the dashboard and shows the compact banner. */
  dashboard?: boolean
}

export interface KarigarConfig {
  model: ModelConfig
  context: ContextConfig
  ui: UiConfig
  /** Direct GPU fleet — CLI picks the fastest healthy node, no Render needed. */
  fleet: FleetNode[]
}

export type PartialKarigarConfig = {
  [K in keyof KarigarConfig]?: K extends 'fleet' ? FleetNode[] : Partial<KarigarConfig[K]>
}
