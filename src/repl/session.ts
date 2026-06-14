import type { ChatMessage } from '../model/types'

export interface Session {
  history: ChatMessage[]
  model: string
}

export function createSession(modelName: string): Session {
  return { history: [], model: modelName }
}

export function addToHistory(session: Session, role: ChatMessage['role'], content: string): void {
  session.history.push({ role, content })
}

export function clearHistory(session: Session): void {
  session.history = []
}
