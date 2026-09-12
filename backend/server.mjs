import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  OpenRouterAuthenticationError,
  OpenRouterClient,
  OpenRouterTimeoutError,
} from './openrouter-client.mjs';

const DEFAULT_PORT = 3001;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

function respond(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(Object.assign(new Error('El cuerpo de la solicitud es demasiado grande.'), { statusCode: 413 }));
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('El cuerpo debe ser JSON válido.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function errorStatus(error) {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  if (error instanceof OpenRouterAuthenticationError) return 401;
  if (error instanceof OpenRouterTimeoutError) return 504;
  return 502;
}

export function createApiServer({ openRouterClient, logger = console, createId = randomUUID }) {
  const conversations = new Map();
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      response.end();
      return;
    }

    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'POST' && url.pathname === '/api/chats') {
        const threadId = `agent_${createId()}`;
        conversations.set(threadId, { messages: [], busy: false });
        respond(response, 201, { allowed: true, agent: { id: threadId } });
        return;
      }

      const match = url.pathname.match(/^\/api\/message\/([^/]+)$/);
      if (request.method === 'POST' && match) {
        let threadId;
        try {
          threadId = decodeURIComponent(match[1]);
        } catch {
          respond(response, 400, { error: 'El ID del agente no es válido.' });
          return;
        }
        const conversation = conversations.get(threadId);
        if (!conversation) {
          respond(response, 404, { error: 'El agente no fue creado por esta aplicación.' });
          return;
        }
        const payload = await readBody(request);
        if (typeof payload.message !== 'string' || !payload.message.trim()) {
          respond(response, 400, { error: 'El campo message debe contener texto.' });
          return;
        }
        if (conversation.busy) {
          respond(response, 409, { error: 'Este agente ya tiene una respuesta en curso.', code: 'OPENROUTER_THREAD_BUSY' });
          return;
        }

        const userMessage = { role: 'user', content: payload.message.trim() };
        conversation.busy = true;
        try {
          const reply = await openRouterClient.complete([...conversation.messages, userMessage], { sessionId: threadId });
          conversation.messages.push(userMessage, { role: 'assistant', content: reply });
          respond(response, 200, { threadId, reply });
        } finally {
          conversation.busy = false;
        }
        return;
      }

      respond(response, 404, { error: 'Ruta no encontrada.' });
    } catch (error) {
      logger.error('Backend request failed:', error);
      respond(response, errorStatus(error), {
        error: error?.message || 'No se pudo completar la solicitud.',
        code: error?.code,
      });
    }
  });
}

export async function startBackend({
  port = Number(process.env.PORT ?? DEFAULT_PORT),
  openRouterClient = new OpenRouterClient(),
} = {}) {
  const server = createApiServer({ openRouterClient });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await openRouterClient.close();
  };
  return { server, openRouterClient, close };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  startBackend({ port })
    .then(({ close, openRouterClient }) => {
      console.log(`Agent Canvas backend listening on http://localhost:${port}`);
      console.log(`OpenRouter model: ${openRouterClient.model}`);
      if (!openRouterClient.apiKey) console.warn('OPENROUTER_API_KEY no está configurada; los mensajes devolverán 401.');
      let closing = false;
      const shutdown = () => {
        if (closing) return;
        closing = true;
        close().finally(() => process.exit(0));
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    })
    .catch((error) => {
      console.error(`No se pudo iniciar el backend: ${error.message}`);
      process.exitCode = 1;
    });
}
