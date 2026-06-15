import type { WorkerNode, Tier, NodeMetrics } from './types'
import { WORKER_NODES, estimateLatency } from './models'

const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_TIMEOUT_MS = 5_000
const FAILURE_THRESHOLD = 3

export class WorkerPool {
  private nodes: WorkerNode[] = []
  private metrics: Map<string, NodeMetrics> = new Map()
  private healthCheckInterval: ReturnType<typeof setInterval> | undefined

  constructor() {
    this.nodes = JSON.parse(JSON.stringify(WORKER_NODES))
    for (const node of this.nodes) {
      this.metrics.set(node.id, {
        uptime: 100,
        requestsCompleted: 0,
        averageLatency: estimateLatency(node.provider, 'medium'),
      })
    }
  }

  startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => this.checkAllHealth(), HEALTH_CHECK_INTERVAL_MS)
    this.checkAllHealth()
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval)
  }

  private async checkAllHealth(): Promise<void> {
    for (const node of this.nodes) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)
        const res = await fetch(`${node.baseUrl}/api/tags`, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          node.health.healthy = true
          node.health.failures = 0
          node.health.lastCheck = Date.now()
        } else {
          this.recordFailure(node)
        }
      } catch {
        this.recordFailure(node)
      }
    }
  }

  private recordFailure(node: WorkerNode): void {
    node.health.failures++
    node.health.lastCheck = Date.now()
    if (node.health.failures >= FAILURE_THRESHOLD) {
      node.health.healthy = false
    }
  }

  selectNode(tier: Tier): WorkerNode | null {
    const tierRank: Record<Tier, number> = { fast: 0, medium: 1, complex: 2 }
    const available = this.nodes.filter(
      n => n.health.healthy && tierRank[n.capabilities.tier] >= tierRank[tier],
    )

    if (available.length === 0) {
      const any = this.nodes.find(n => n.health.healthy)
      if (!any) return null
      return any
    }

    available.sort(
      (a, b) =>
        estimateLatency(a.provider, tier) - estimateLatency(b.provider, tier),
    )

    return available[0] ?? null
  }

  recordRequest(nodeId: string, latency: number): void {
    const node = this.nodes.find(n => n.id === nodeId)
    if (!node) return

    const m = this.metrics.get(nodeId)
    if (m) {
      m.requestsCompleted++
      m.averageLatency = (m.averageLatency + latency) / 2
    }

    node.health.failures = Math.max(0, node.health.failures - 1)
  }

  recordError(nodeId: string, error: string): void {
    const node = this.nodes.find(n => n.id === nodeId)
    if (!node) return
    this.recordFailure(node)
    const m = this.metrics.get(nodeId)
    if (m) m.lastError = error
  }

  getMetrics(nodeId: string): NodeMetrics | null {
    return this.metrics.get(nodeId) ?? null
  }

  getAllNodes(): WorkerNode[] {
    return this.nodes
  }

  getHealthSummary(): { healthy: number; total: number; nodes: Array<{ id: string; healthy: boolean }> } {
    const healthy = this.nodes.filter(n => n.health.healthy).length
    return {
      healthy,
      total: this.nodes.length,
      nodes: this.nodes.map(n => ({ id: n.id, healthy: n.health.healthy })),
    }
  }
}

export const pool = new WorkerPool()
