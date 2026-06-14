import type { RouterRequest } from './types'
import { pool } from './pool'
import { modelForTier } from './models'

const REQUEST_TIMEOUT_MS = 120_000

interface OllamaChunk {
  message?: { content?: string }
  done: boolean
}

export async function* dispatchRequest(req: RouterRequest): AsyncIterable<string> {
  const node = pool.selectNode(req.tier)
  if (!node) {
    throw new Error('No healthy nodes available. Please try again later.')
  }

  const model = modelForTier(req.tier, node.models.fastModel, node.models.codingModel)
  const url = `${node.baseUrl}/api/chat`

  const startTime = Date.now()
  let res: Response

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const body = JSON.stringify({
      model,
      messages: req.messages,
      stream: true,
      options: {
        temperature: req.temperature ?? 0.2,
        num_predict: req.maxTokens ?? 2048,
      },
    })

    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
  } catch (err) {
    pool.recordError(node.id, String(err))
    throw new Error(`Failed to reach node ${node.id} (${node.provider}): ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!res.ok) {
    pool.recordError(node.id, `HTTP ${res.status}`)
    throw new Error(`Node ${node.id} returned HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body from node')

  const decoder = new TextDecoder()
  let buf = ''
  let done = false

  while (!done) {
    const { done: streamDone, value } = await reader.read()
    if (streamDone) break
    buf += decoder.decode(value, { stream: true })

    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const chunk = JSON.parse(trimmed) as OllamaChunk
      const text = chunk.message?.content ?? ''
      if (text) yield text
      if (chunk.done) done = true
    }
  }

  const totalLatency = Date.now() - startTime
  pool.recordRequest(node.id, totalLatency)
  clearTimeout(timeout)
}
