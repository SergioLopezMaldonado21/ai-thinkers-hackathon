export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionOptions {
  sessionId: string;
  timeoutMs?: number;
}

export interface ChatCompletionGateway {
  complete(messages: readonly ChatMessage[], options: CompletionOptions): Promise<string>;
}

export interface Conversation {
  id: string;
  profile: import('./agent-profile.js').AgentProfile;
  messages: ChatMessage[];
  busy: boolean;
}
