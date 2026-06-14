export type Tier = 'fast' | 'medium' | 'complex'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RouterRequest {
  messages: ChatMessage[]
  tier: Tier
  temperature?: number
  maxTokens?: number
}

export interface WorkerNode {
  id: string
  provider: 'colab' | 'kaggle' | 'lightning-gpu' | 'oracle-arm' | 'lightning-cpu' | 'hf-spaces'
  baseUrl: string
  models: {
    fastModel: string
    codingModel: string
  }
  capabilities: {
    tier: Tier
    maxConcurrent: number
    quotaHours?: number
  }
  health: {
    healthy: boolean
    lastCheck: number
    failures: number
  }
}

export interface DispatchPlan {
  nodeId: string
  model: string
  estimatedLatency: number
}

export interface NodeMetrics {
  uptime: number
  requestsCompleted: number
  averageLatency: number
  lastError?: string
}
