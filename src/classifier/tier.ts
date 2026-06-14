export type Tier = 'fast' | 'medium' | 'complex'

export interface TierResult {
  tier: Tier
  reason: string
}

const COMPLEX_KEYWORDS = [
  'architecture', 'refactor', 'redesign', 'debug', 'migrate', 'module',
  'system', 'pipeline', 'integrate', 'optimise', 'optimize', 'performance',
  'security', 'authentication', 'database', 'schema', 'deploy', 'dockerfile',
]

const MEDIUM_KEYWORDS = [
  'function', 'class', 'component', 'fix', 'bug', 'error', 'test', 'explain',
  'implement', 'write', 'create', 'add', 'update', 'handle', 'parse', 'format',
]

export function classifyTier(prompt: string): TierResult {
  const lower = prompt.toLowerCase().trim()
  const wordCount = lower.split(/\s+/).length
  const hasCodeBlock = prompt.includes('```') || prompt.includes('@file') || prompt.includes('@diff')
  const hasDirective = /^@(file|diff|selection|dir)/.test(lower) || lower.includes(' @file') || lower.includes(' @diff')

  // Complex: long prompts, code context, or complex keywords
  if (
    wordCount > 40 ||
    (hasCodeBlock && wordCount > 15) ||
    COMPLEX_KEYWORDS.some(k => lower.includes(k))
  ) {
    return { tier: 'complex', reason: 'complex keywords or long prompt' }
  }

  // Fast: very short, no code context, no medium keywords
  if (
    wordCount <= 8 &&
    !hasDirective &&
    !MEDIUM_KEYWORDS.some(k => lower.includes(k))
  ) {
    return { tier: 'fast', reason: 'short casual prompt' }
  }

  // Default: medium
  return { tier: 'medium', reason: 'coding task or moderate length' }
}

/** Map a tier to the recommended model name given available options. */
export function modelForTier(tier: Tier, fastModel: string, codingModel: string): string {
  return tier === 'fast' ? fastModel : codingModel
}
