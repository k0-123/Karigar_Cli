export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelRequest {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

export interface Token {
  text: string
  done: boolean
}

export interface ModelClient {
  chat(request: ModelRequest): AsyncIterable<Token>
}
