import type { ModelClient, ModelRequest, Token } from '../types'
import type { FleetNode } from '../../config/types'
import type { Tier } from '../../classifier/tier'
import { modelForTier } from '../../classifier/tier'

const HEALTH_TIMEOUT_MS = 4_000
const STREAM_TIMEOUT_MS = 60_000

// How fast we expect each provider to be (ms) — used to sort candidates.
const PROVIDER_LATENCY_MS: Record<string, number> = {
  'colab': 1200,
  'kaggle': 1500,
  'lightning-gpu': 1800,
  'oracle-arm': 2000,
  'lightning-cpu': 5000,
}

interface OllamaChunk {
  message?: { content?: string }
  done: boolean
}

async function isHealthy(node: FleetNode): Promise<boolean> {
  try {
    const res = await fetch(`${node.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    return res.ok
  } catch {
    return false
  }
}

const TIER_RANK: Record<Tier, number> = { fast: 0, medium: 1, complex: 2 }

export class FleetProvider implements ModelClient {
  private tier: Tier = 'medium'
  private modelOverride: string | null = null

  constructor(private readonly nodes: FleetNode[]) {}

  withTier(tier: Tier): this {
    this.tier = tier
    return this
  }

  /** Force a specific model, bypassing tier-based selection. */
  withModel(model: string): this {
    this.modelOverride = model
    return this
  }

  async *chat(request: ModelRequest): AsyncIterable<Token> {
    // Health-check all nodes in parallel and pick the fastest healthy one.
    const results = await Promise.all(
      this.nodes.map(async n => ({ node: n, healthy: await isHealthy(n) })),
    )

    const tier = this.tier
    const candidates = results
      .filter(r => r.healthy && TIER_RANK[r.node.tier] >= TIER_RANK[tier])
      .sort(
        (a, b) =>
          (PROVIDER_LATENCY_MS[a.node.provider] ?? 9999) -
          (PROVIDER_LATENCY_MS[b.node.provider] ?? 9999),
      )

    const chosen = candidates[0]?.node ?? results.find(r => r.healthy)?.node

    if (!chosen) {
      throw new Error(
        'No healthy fleet nodes available. Check that your Colab/Kaggle session is still running.',
      )
    }

    // Warn if we're degrading to a weaker model due to node failure
    const downNode = results.find(r => r.node.tier === 'complex' && !r.healthy)
    if (tier === 'complex' && chosen.tier !== 'complex' && downNode) {
      console.warn(`⚠  ${downNode.node.id} is down — using ${chosen.id}'s ${chosen.codingModel} instead of ${downNode.node.codingModel}`)
    }

    const model =
      this.modelOverride ?? modelForTier(tier, chosen.fastModel, chosen.codingModel)

    // Debug: show which model is being used
    if (process.env.DEBUG_MODEL) {
      console.log(`[DEBUG] Using ${model} from ${chosen.id} (tier: ${tier})`)
    }

    const url = `${chosen.baseUrl}/api/chat`
    const body = JSON.stringify({
      model,
      messages: request.messages,
      stream: true,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
      },
    })

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body,
        signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      })
    } catch {
      throw new Error(
        `Fleet node "${chosen.id}" (${chosen.baseUrl}) stopped responding. Is the session still alive?`,
      )
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Fleet node "${chosen.id}" returned HTTP ${res.status}: ${text}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from fleet node')

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
        let chunk: OllamaChunk
        try {
          chunk = JSON.parse(trimmed) as OllamaChunk
        } catch {
          continue
        }
        const text = chunk.message?.content ?? ''
        yield { text, done: chunk.done }
        if (chunk.done) return
      }
    }
  }
}
