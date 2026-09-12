import { createServer, type Server } from 'node:http';
import type { ConversationService } from '../application/conversation-service.js';
import type { OfficeCoordinationService } from '../application/office-coordination-service.js';
import type { OfficeRegistry } from '../application/office-registry.js';
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
  offices?: OfficeRegistry;
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
  offices,
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

      if (offices && request.method === 'GET' && url.pathname === '/api/offices') {
        sendJson(response, 200, { offices: offices.list(), defaultOfficeId: offices.defaultOfficeId }, allowedOrigin);
        return;
      }
      if (offices && request.method === 'POST' && url.pathname === '/api/offices') {
        const context = offices.create(await readJsonBody(request, maxBodyBytes));
        sendJson(response, 201, { office: context.metadata }, allowedOrigin);
        return;
      }

      const scopedRoute = offices ? url.pathname.match(/^\/api\/offices\/([^/]+)(\/.*)$/) : null;
      const scopedContext = scopedRoute?.[1] ? offices!.get(decodeConversationId(scopedRoute[1])) : null;
      const scopedPath = scopedRoute?.[2];
      const routeConversations = scopedContext?.conversations ?? conversations;
      const routeOffice = scopedContext?.office ?? office;

      const historyRoute = (scopedPath ?? url.pathname).match(/^\/(?:api\/)?chats\/([^/]+)\/messages$/);
      if (request.method === 'GET' && historyRoute?.[1]) {
        const conversation = routeConversations.getConversation(decodeConversationId(historyRoute[1]));
        sendJson(response, 200, {
          messages: conversation.messages.filter((message) => message.role !== 'system').map((message) => ({
            role: message.role === 'assistant' ? 'agent' : 'user', text: message.content,
          })),
          pending: conversation.busy,
        }, allowedOrigin);
        return;
      }
      if (routeOffice && request.method === 'GET' && (scopedPath ?? url.pathname) === (scopedPath ? '/office' : '/api/office')) {
        sendJson(response, 200, routeOffice.getSnapshot(), allowedOrigin);
        return;
      }
      if (routeOffice && request.method === 'GET' && (scopedPath ?? url.pathname) === (scopedPath ? '/communications' : '/api/communications')) {
        sendJson(response, 200, { communications: routeOffice.getCommunications(url.searchParams.get('bossId') ?? undefined, url.searchParams.get('subordinateId') ?? undefined) }, allowedOrigin);
        return;
      }
      if (routeOffice && request.method === 'PUT' && (scopedPath ?? url.pathname) === (scopedPath ? '/office/tree' : '/api/office/tree')) {
        routeOffice.setTree(await readJsonBody(request, maxBodyBytes));
        sendJson(response, 200, routeOffice.getSnapshot(), allowedOrigin);
        return;
      }

      if (request.method === 'POST' && (scopedPath ?? url.pathname) === (scopedPath ? '/chats' : '/api/chats')) {
        const profile = parseCreateAgentRequest(await readJsonBody(request, maxBodyBytes));
        const conversationId = routeConversations.createConversation(profile);
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

      const messageRoute = (scopedPath ?? url.pathname).match(/^\/(?:api\/)?message\/([^/]+)$/);
      if (request.method === 'POST' && messageRoute?.[1]) {
        const conversationId = decodeConversationId(messageRoute[1]);
        const payload = await readJsonBody(request, maxBodyBytes);
        const result = routeOffice
          ? await routeOffice.sendMessage(conversationId, messageFromPayload(payload))
          : { reply: await routeConversations.sendMessage(conversationId, messageFromPayload(payload)) };
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
