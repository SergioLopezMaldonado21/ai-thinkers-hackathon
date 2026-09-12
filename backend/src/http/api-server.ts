import { createServer, type Server } from 'node:http';
import type { ConversationService } from '../application/conversation-service.js';
import type { OfficeCoordinationService } from '../application/office-coordination-service.js';
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
  office?: OfficeCoordinationService;
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
  office,
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

      const historyRoute = url.pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
      if (request.method === 'GET' && historyRoute?.[1]) {
        const conversation = conversations.getConversation(decodeConversationId(historyRoute[1]));
        sendJson(response, 200, {
          messages: conversation.messages.filter((message) => message.role !== 'system').map((message) => ({
            role: message.role === 'assistant' ? 'agent' : 'user', text: message.content,
          })),
          pending: conversation.busy,
        }, allowedOrigin);
        return;
      }
      if (office && request.method === 'GET' && url.pathname === '/api/office') {
        sendJson(response, 200, office.getSnapshot(), allowedOrigin);
        return;
      }
      if (office && request.method === 'GET' && url.pathname === '/api/communications') {
        sendJson(response, 200, { communications: office.getCommunications(url.searchParams.get('bossId') ?? undefined, url.searchParams.get('subordinateId') ?? undefined) }, allowedOrigin);
        return;
      }
      if (office && request.method === 'PUT' && url.pathname === '/api/office/tree') {
        office.setTree(await readJsonBody(request, maxBodyBytes));
        sendJson(response, 200, office.getSnapshot(), allowedOrigin);
        return;
      }

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
        const result = office
          ? await office.sendMessage(conversationId, messageFromPayload(payload))
          : { reply: await conversations.sendMessage(conversationId, messageFromPayload(payload)) };
        sendJson(response, 200, { threadId: conversationId, ...result }, allowedOrigin);
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
