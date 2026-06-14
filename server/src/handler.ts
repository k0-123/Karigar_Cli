import type { Request, Response } from 'express'
import type { RouterRequest } from './types'
import { dispatchRequest } from './dispatch'
import { pool } from './pool'

export async function chatHandler(req: Request, res: Response): Promise<void> {
  const token = req.headers['x-karigar-token'] as string | undefined
  if (process.env.AUTH_TOKEN && token !== process.env.AUTH_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const body = req.body as RouterRequest
  if (!body.messages || !Array.isArray(body.messages)) {
    res.status(400).json({ error: 'Missing or invalid messages' })
    return
  }
  if (!body.tier || !['fast', 'medium', 'complex'].includes(body.tier)) {
    res.status(400).json({ error: 'Invalid tier' })
    return
  }

  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')

  try {
    for await (const text of dispatchRequest(body)) {
      const chunk = JSON.stringify({ text, done: false })
      res.write(chunk + '\n')
    }
    const done = JSON.stringify({ text: '', done: true })
    res.write(done + '\n')
    res.end()
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    res.write(JSON.stringify({ error }) + '\n')
    res.end()
  }
}

export function healthHandler(_req: Request, res: Response): void {
  const summary = pool.getHealthSummary()
  res.json({
    status: summary.healthy > 0 ? 'ok' : 'degraded',
    ...summary,
  })
}

export function metricsHandler(_req: Request, res: Response): void {
  const nodes = pool.getAllNodes()
  const metrics = nodes.map(n => ({
    id: n.id,
    provider: n.provider,
    healthy: n.health.healthy,
    stats: pool.getMetrics(n.id),
  }))
  res.json({ nodes: metrics })
}
