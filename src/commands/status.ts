import type { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { configPath } from '../utils/config'
import { logger } from '../utils/logger'

interface HealthResponse {
  status: string
  healthy: number
  total: number
  nodes: Array<{ id: string; healthy: boolean }>
}

interface MetricsResponse {
  nodes: Array<{
    id: string
    provider: string
    healthy: boolean
    stats: { averageLatency: number; requestsCompleted: number; lastError?: string } | null
  }>
}

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show health and metrics of the connected Karigar server.')
    .action(async () => {
      let config: Record<string, unknown> = {}
      const path = configPath()
      if (existsSync(path)) {
        try { config = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown> } catch { /* ignore */ }
      }

      const model = (config.model ?? {}) as Record<string, unknown>
      const provider = model.provider as string | undefined
      const baseUrl = model.baseUrl as string | undefined

      if (provider !== 'remote' || !baseUrl) {
        logger.warn('Not connected to any server.')
        logger.dim('Run: karigar connect <url>')
        return
      }

      logger.info(`Server: ${baseUrl}`)

      let health: HealthResponse
      try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        health = await res.json() as HealthResponse
      } catch (err) {
        logger.error(`Server unreachable: ${err instanceof Error ? err.message : String(err)}`)
        return
      }

      const statusLabel = health.status === 'ok' ? 'ok' : 'degraded'
      logger.info(`Status: ${statusLabel} (${health.healthy}/${health.total} nodes healthy)`)

      let metrics: MetricsResponse
      try {
        const res = await fetch(`${baseUrl}/metrics`, { signal: AbortSignal.timeout(5_000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        metrics = await res.json() as MetricsResponse
      } catch {
        logger.dim('(metrics unavailable)')
        return
      }

      const col = (s: string, w: number) => s.padEnd(w)
      console.log('')
      console.log(
        col('NODE', 14) + col('PROVIDER', 14) + col('HEALTHY', 10) + col('AVG LATENCY', 14) + 'REQUESTS',
      )
      console.log('─'.repeat(62))

      for (const node of metrics.nodes) {
        const healthy = node.healthy ? '✓' : '✗'
        const latency = node.stats
          ? `${(node.stats.averageLatency / 1000).toFixed(1)}s`
          : '—'
        const reqs = node.stats ? String(node.stats.requestsCompleted) : '—'
        console.log(
          col(node.id, 14) + col(node.provider, 14) + col(healthy, 10) + col(latency, 14) + reqs,
        )
        if (node.stats?.lastError) {
          logger.dim(`  └ last error: ${node.stats.lastError}`)
        }
      }
      console.log('')
    })
}
