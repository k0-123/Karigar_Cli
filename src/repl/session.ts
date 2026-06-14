import type { ChatMessage } from '../model/types'

export interface Session {
  history: ChatMessage[]
  model: string
  /**
   * When set, forces this model for every request, overriding tier-based
   * selection. Cleared by `/model auto`. Null = automatic (pick by tier).
   */
  modelOverride: string | null
}

export function createSession(modelName: string): Session {
  return { history: [], model: modelName, modelOverride: null }
}

export function addToHistory(session: Session, role: ChatMessage['role'], content: string): void {
  session.history.push({ role, content })
}

export function clearHistory(session: Session): void {
  session.history = []
}
