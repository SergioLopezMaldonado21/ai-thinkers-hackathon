export type ChatMessage = { role: 'user' | 'agent' | 'error'; text: string };
export type Conversation = { messages: ChatMessage[]; pending: boolean };

export class ConversationStore {
  readonly #conversations = new Map<string, Conversation>();

  get(threadId: string): Conversation {
    let conversation = this.#conversations.get(threadId);
    if (!conversation) {
      conversation = { messages: [], pending: false };
      this.#conversations.set(threadId, conversation);
    }
    return conversation;
  }

  startTurn(threadId: string, message: string): boolean {
    const conversation = this.get(threadId);
    if (conversation.pending) return false;
    conversation.messages.push({ role: 'user', text: message });
    conversation.pending = true;
    return true;
  }

  finishTurn(threadId: string, reply: string) {
    const conversation = this.get(threadId);
    conversation.messages.push({ role: 'agent', text: reply });
    conversation.pending = false;
  }

  failTurn(threadId: string, error: string) {
    const conversation = this.get(threadId);
    conversation.messages.push({ role: 'error', text: error });
    conversation.pending = false;
  }
}
