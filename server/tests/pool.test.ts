import { describe, it, expect, beforeEach } from 'vitest'
import { WorkerPool } from '../src/pool'

describe('WorkerPool', () => {
  let p: WorkerPool

  beforeEach(() => {
    p = new WorkerPool()
  })

  it('initializes with nodes', () => {
    const nodes = p.getAllNodes()
    expect(nodes.length).toBeGreaterThan(0)
  })

  it('selects a node for complex tier', () => {
    const node = p.selectNode('complex')
    expect(node).not.toBeNull()
    expect(node?.capabilities.tier).toBe('complex')
  })

  it('selects a node for fast tier', () => {
    const node = p.selectNode('fast')
    expect(node).not.toBeNull()
  })

  it('records request metrics', () => {
    const nodes = p.getAllNodes()
    const nodeId = nodes[0]!.id
    p.recordRequest(nodeId, 1000)
    const metrics = p.getMetrics(nodeId)
    expect(metrics?.requestsCompleted).toBe(1)
    expect(metrics?.averageLatency).toBeGreaterThan(0)
  })

  it('tracks node failures', () => {
    const nodes = p.getAllNodes()
    const nodeId = nodes[0]!.id
    p.recordError(nodeId, 'Test error')
    const summary = p.getHealthSummary()
    expect(summary.total).toBeGreaterThan(0)
  })

  it('provides health summary', () => {
    const summary = p.getHealthSummary()
    expect(summary.healthy).toBeGreaterThanOrEqual(0)
    expect(summary.total).toBeGreaterThan(0)
    expect(summary.nodes.length).toEqual(summary.total)
  })
})
