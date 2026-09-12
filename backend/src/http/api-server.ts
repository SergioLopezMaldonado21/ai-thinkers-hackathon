import { createServer, type Server } from 'node:http';
import type { ConversationService } from '../application/conversation-service.js';
import { ValidationError } from '../core/errors.js';
import {
  parseCreateAgentRequest,
  type CreateAgentResponse,
} from './chat-contract.js';
import {
  errorResponse,
  readJsonBody,
  sendCorsPreflight,
  sendJson,
} from './http-utils.js';

export interface Logger {
  error(message: string, error: unknown): void;
}

export interface ApiServerOptions {
  conversations: ConversationService;
  allowedOrigin: string;
  maxBodyBytes: number;
  logger?: Logger;
}

function messageFromPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  return Reflect.get(payload, 'message');
}

function decodeConversationId(encodedId: string): string {
  try {
    return decodeURIComponent(encodedId);
  } catch {
    throw new ValidationError('El ID del agente no es válido.', 'INVALID_CONVERSATION_ID');
  }
}

export function createApiServer({
  conversations,
  allowedOrigin,
  maxBodyBytes,
  logger = console,
}: ApiServerOptions): Server {
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendCorsPreflight(response, allowedOrigin);
      return;
    }

    try {
      const url = new URL(request.url ?? '/', 'http://localhost');

      if (request.method === 'POST' && url.pathname === '/api/chats') {
        const profile = parseCreateAgentRequest(await readJsonBody(request, maxBodyBytes));
        const conversationId = conversations.createConversation(profile);
        const body: CreateAgentResponse = {
          allowed: true,
          agent: { id: conversationId, profile },
        };
        sendJson(
          response,
          201,
          body,
          allowedOrigin,
        );
        return;
      }

      const messageRoute = url.pathname.match(/^\/api\/message\/([^/]+)$/);
      if (request.method === 'POST' && messageRoute?.[1]) {
        const conversationId = decodeConversationId(messageRoute[1]);
        const payload = await readJsonBody(request, maxBodyBytes);
        const reply = await conversations.sendMessage(
          conversationId,
          messageFromPayload(payload),
        );
        sendJson(response, 200, { threadId: conversationId, reply }, allowedOrigin);
        return;
      }

      sendJson(response, 404, { error: 'Ruta no encontrada.' }, allowedOrigin);
    } catch (error) {
      logger.error('Backend request failed:', error);
      const responseError = errorResponse(error);
      sendJson(response, responseError.statusCode, responseError.body, allowedOrigin);
    }
  });
}
