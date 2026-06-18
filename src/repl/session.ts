import type { ChatMessage } from '../model/types'

/** REPL interaction mode. Plan = outline first, God = max-power autonomous. */
export type ReplMode = 'normal' | 'plan' | 'god'

export interface Session {
  history: ChatMessage[]
  model: string
  /**
   * When set, forces this model for every request, overriding tier-based
   * selection. Cleared by `/model auto`. Null = automatic (pick by tier).
   */
  modelOverride: string | null
  /** Current interaction mode, toggled by `/plan` and `/god`. */
  mode: ReplMode
}

export function createSession(modelName: string): Session {
  return { history: [], model: modelName, modelOverride: null, mode: 'normal' }
}

export function addToHistory(session: Session, role: ChatMessage['role'], content: string): void {
  session.history.push({ role, content })
}

export function clearHistory(session: Session): void {
  session.history = []
}
