import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { ConversationService } from '../src/application/conversation-service.js';
import type {
  ChatCompletionGateway,
  ChatMessage,
  CompletionOptions,
} from '../src/domain/chat.js';
import { createApiServer } from '../src/http/api-server.js';
import {
  OpenRouterAuthenticationError,
  OpenRouterTimeoutError,
} from '../src/infrastructure/openrouter/openrouter-client.js';

const agentProfile = {
  name: 'Ada',
  position: 'Investigadora principal',
  responsibilities: 'Investigar y organizar evidencia relevante.',
  limitations: 'No presentar suposiciones como hechos.',
  deliverables: 'Hallazgos documentados y fuentes.',
  skills: ['Investigación', 'Síntesis'],
  operationalRole: 'researcher_intel' as const,
  thinkingRole: 'analyst' as const,
};

interface HttpResult {
  status: number;
  body: Record<string, unknown>;
}

async function withServer(
  completionGateway: ChatCompletionGateway,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  let sequence = 0;
  const conversations = new ConversationService(
    completionGateway,
    () => `id-${++sequence}`,
  );
  const server = createApiServer({
    conversations,
    allowedOrigin: 'http://localhost:5173',
    maxBodyBytes: 64 * 1024,
    logger: { error() {} },
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function post(baseUrl: string, path: string, body?: unknown): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined && path === '/api/chats' ? JSON.stringify(agentProfile) : body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

test('crea IDs locales y conserva historiales independientes', async () => {
  const calls: Array<{
    messages: readonly ChatMessage[];
    options: CompletionOptions;
  }> = [];
  const client: ChatCompletionGateway = {
    async complete(messages, options) {
      calls.push({ messages: structuredClone(messages), options });
      return `respuesta-${calls.length}`;
    },
  };

  await withServer(client, async (baseUrl) => {
    const first = await post(baseUrl, '/api/chats');
    const second = await post(baseUrl, '/api/chats');
    assert.deepEqual(first, {
      status: 201,
      body: { allowed: true, agent: { id: 'agent_id-1', profile: agentProfile } },
    });
    assert.deepEqual(second.body.agent, { id: 'agent_id-2', profile: agentProfile });

    assert.equal((await post(baseUrl, '/api/message/external', { message: 'hola' })).status, 404);
    assert.equal((await post(baseUrl, '/api/message/agent_id-1', { message: '   ' })).status, 400);
    assert.deepEqual(await post(baseUrl, '/api/message/agent_id-1', { message: ' uno ' }), {
      status: 200,
      body: { threadId: 'agent_id-1', reply: 'respuesta-1' },
    });
    await post(baseUrl, '/api/message/agent_id-2', { message: 'otro' });
    await post(baseUrl, '/api/message/agent_id-1', { message: 'dos' });
  });

  assert.deepEqual(calls[0], {
    messages: [
      {
        role: 'system',
        content: 'You are Ada, Investigadora principal.\nYour operational role is The Researcher / Intel. It defines what you do within the office.\nYour thinking role is The Analyst. It defines how you approach that operational work and never replaces it.\nWhat you do: Investigar y organizar evidencia relevante.\nWhat you do not do: No presentar suposiciones como hechos.\nWhat you deliver: Hallazgos documentados y fuentes.\nSkills: Investigación, Síntesis.\nFollow these boundaries in every response. If a request is outside your scope, state that clearly and offer the most useful in-scope contribution.',
      },
      { role: 'user', content: 'uno' },
    ],
    options: { sessionId: 'agent_id-1' },
  });
  assert.deepEqual(calls[1]?.messages.slice(1), [{ role: 'user', content: 'otro' }]);
  assert.deepEqual(calls[2]?.messages.slice(1), [
    { role: 'user', content: 'uno' },
    { role: 'assistant', content: 'respuesta-1' },
    { role: 'user', content: 'dos' },
  ]);
});

test('valida el contrato de creación del agente y sus roles controlados', async () => {
  const client: ChatCompletionGateway = { async complete() { return 'ok'; } };

  await withServer(client, async (baseUrl) => {
    const missingProfile = await post(baseUrl, '/api/chats', {});
    assert.deepEqual(missingProfile, {
      status: 400,
      body: { error: 'El campo name es obligatorio.', code: 'NAME_REQUIRED' },
    });

    const invalidRole = await post(baseUrl, '/api/chats', {
      ...agentProfile,
      operationalRole: 'invented_role',
    });
    assert.deepEqual(invalidRole, {
      status: 400,
      body: { error: 'El campo operationalRole no contiene un rol válido.', code: 'OPERATIONALROLE_INVALID' },
    });

    const created = await post(baseUrl, '/api/chats', agentProfile);
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.agent, { id: 'agent_id-1', profile: agentProfile });
  });
});

test('bloquea sólo el agente que tiene una respuesta activa', async () => {
  let release: (value: string) => void = () => undefined;
  const held = new Promise<string>((resolve) => {
    release = resolve;
  });
  const client: ChatCompletionGateway = {
    async complete(messages) {
      return messages.at(-1)?.content === 'espera' ? held : 'libre';
    },
  };

  await withServer(client, async (baseUrl) => {
    await post(baseUrl, '/api/chats');
    await post(baseUrl, '/api/chats');
    const pending = post(baseUrl, '/api/message/agent_id-1', { message: 'espera' });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(
      (await post(baseUrl, '/api/message/agent_id-1', { message: 'duplicado' })).status,
      409,
    );
    assert.equal(
      (await post(baseUrl, '/api/message/agent_id-2', { message: 'paralelo' })).status,
      200,
    );
    release('terminado');
    assert.equal((await pending).body.reply, 'terminado');
  });
});

test('mapea autenticación y timeout al contrato HTTP', async () => {
  let error: Error = new OpenRouterAuthenticationError();
  const client: ChatCompletionGateway = {
    async complete() {
      throw error;
    },
  };

  await withServer(client, async (baseUrl) => {
    await post(baseUrl, '/api/chats');
    assert.equal(
      (await post(baseUrl, '/api/message/agent_id-1', { message: 'uno' })).status,
      401,
    );
    error = new OpenRouterTimeoutError();
    assert.equal(
      (await post(baseUrl, '/api/message/agent_id-1', { message: 'dos' })).status,
      504,
    );
  });
});
