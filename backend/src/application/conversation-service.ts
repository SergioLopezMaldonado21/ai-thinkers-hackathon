import type {
  ChatCompletionGateway,
  ChatMessage,
  Conversation,
} from '../domain/chat.js';
import type { AgentProfile } from '../domain/agent-profile.js';
import { agentInstructions } from './agent-instructions.js';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors.js';

export type IdFactory = () => string;

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

  async sendMessage(conversationId: string, rawMessage: unknown): Promise<string> {
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
      const reply = await this.completionGateway.complete(
        [agentInstructions(conversation.profile), ...conversation.messages, userMessage],
        { sessionId: conversation.id },
      );
      conversation.messages.push(userMessage, { role: 'assistant', content: reply });
      return reply;
    } finally {
      conversation.busy = false;
    }
  }
}
