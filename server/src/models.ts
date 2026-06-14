import type { WorkerNode, Tier } from './types'

export const WORKER_NODES: WorkerNode[] = [
  {
    id: 'colab-1',
    provider: 'colab',
    baseUrl: process.env.COLAB_BASEURL || 'http://localhost:11434',
    models: {
      fastModel: 'deepseek-r1:1.5b',
      codingModel: 'qwen2.5-coder:14b',
    },
    capabilities: {
      tier: 'complex',
      maxConcurrent: 2,
      quotaHours: 12,
    },
    health: {
      healthy: true,
      lastCheck: Date.now(),
      failures: 0,
    },
  },
  {
    id: 'kaggle-1',
    provider: 'kaggle',
    baseUrl: process.env.KAGGLE_BASEURL || 'http://localhost:11435',
    models: {
      fastModel: 'deepseek-r1:1.5b',
      codingModel: 'qwen2.5-coder:14b',
    },
    capabilities: {
      tier: 'complex',
      maxConcurrent: 2,
      quotaHours: 30 / 7,
    },
    health: {
      healthy: true,
      lastCheck: Date.now(),
      failures: 0,
    },
  },
  {
    id: 'oracle-arm',
    provider: 'oracle-arm',
    baseUrl: process.env.ORACLE_BASEURL || 'http://localhost:11434',
    models: {
      fastModel: 'deepseek-r1:7b',
      codingModel: 'qwen2.5-coder:7b',
    },
    capabilities: {
      tier: 'complex',
      maxConcurrent: 4,
    },
    health: {
      healthy: true,
      lastCheck: Date.now(),
      failures: 0,
    },
  },
  {
    id: 'lightning-cpu',
    provider: 'lightning-cpu',
    baseUrl: process.env.LIGHTNING_CPU_BASEURL || 'http://localhost:11436',
    models: {
      fastModel: 'deepseek-r1:1.5b',
      codingModel: 'deepseek-r1:1.5b',
    },
    capabilities: {
      tier: 'fast',
      maxConcurrent: 1,
    },
    health: {
      healthy: true,
      lastCheck: Date.now(),
      failures: 0,
    },
  },
]

export function modelForTier(tier: Tier, fastModel: string, codingModel: string): string {
  return tier === 'fast' ? fastModel : codingModel
}

export function estimateLatency(provider: string, tier: Tier): number {
  const base: Record<string, number> = {
    'colab': 1200,
    'kaggle': 1500,
    'oracle-arm': 2000,
    'lightning-gpu': 1800,
    'lightning-cpu': 5000,
    'hf-spaces': 35000,
  }
  const tierMultiplier: Record<Tier, number> = {
    'fast': 1.0,
    'medium': 1.2,
    'complex': 2.5,
  }
  return (base[provider] || 5000) * tierMultiplier[tier]
}
