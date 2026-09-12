import type {
  ChatCompletionGateway,
  ChatMessage,
  Conversation,
} from '../domain/chat.js';
import type { AgentProfile } from '../domain/agent-profile.js';
import { agentInstructions } from './agent-instructions.js';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors.js';

export type IdFactory = () => string;
export type ConversationResponder = (messages: readonly ChatMessage[]) => Promise<string>;

export class ConversationService {
  private readonly conversations = new Map<string, Conversation>();

  constructor(
    private readonly completionGateway: ChatCompletionGateway,
    private readonly createId: IdFactory,
  ) {}

  createConversation(profile: AgentProfile): string {
    const conversationId = `agent_${this.createId()}`;
    this.conversations.set(conversationId, {
      id: conversationId,
      profile,
      messages: [],
      busy: false,
    });
    return conversationId;
  }

  listAgents(): Array<{ id: string; profile: AgentProfile }> {
    return [...this.conversations.values()].map(({ id, profile }) => ({ id, profile: structuredClone(profile) }));
  }

  getConversation(conversationId: string): Conversation {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new NotFoundError('El agente no fue creado por esta aplicación.', 'CONVERSATION_NOT_FOUND');
    return structuredClone(conversation);
  }

  completeInternal(messages: readonly ChatMessage[], sessionId: string): Promise<string> {
    return this.completionGateway.complete(messages, { sessionId });
  }

  async sendMessage(conversationId: string, rawMessage: unknown, responder?: ConversationResponder): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new NotFoundError(
        'El agente no fue creado por esta aplicación.',
        'CONVERSATION_NOT_FOUND',
      );
    }

    if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
      throw new ValidationError(
        'El campo message debe contener texto.',
        'MESSAGE_REQUIRED',
      );
    }

    if (conversation.busy) {
      throw new ConflictError(
        'Este agente ya tiene una respuesta en curso.',
        'OPENROUTER_THREAD_BUSY',
      );
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: rawMessage.trim(),
    };

    conversation.busy = true;
    try {
      const messages = [agentInstructions(conversation.profile), ...conversation.messages, userMessage];
      const reply = responder
        ? await responder(messages)
        : await this.completionGateway.complete(messages, { sessionId: conversation.id });
      conversation.messages.push(userMessage, { role: 'assistant', content: reply });
      return reply;
    } finally {
      conversation.busy = false;
    }
  }
}
