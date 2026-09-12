import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '../src/domain/chat.js';
import {
  OpenRouterAuthenticationError,
  OpenRouterClient,
  OpenRouterTimeoutError,
  type FetchImplementation,
} from '../src/infrastructure/openrouter/openrouter-client.js';

const message: ChatMessage = { role: 'user', content: 'hola' };

test('requiere la API key sin hacer una solicitud de red', async () => {
  let called = false;
  const fetchImpl: FetchImplementation = async () => {
    called = true;
    return new Response();
  };
  const client = new OpenRouterClient({ apiKey: '', fetchImpl });

  await assert.rejects(
    client.complete([message], { sessionId: 'agent-1' }),
    OpenRouterAuthenticationError,
  );
  assert.equal(called, false);
});

test('envía el historial y la sesión al endpoint de chat completions', async () => {
  let captured: { url: string | URL; options?: RequestInit } | undefined;
  const client = new OpenRouterClient({
    apiKey: 'test-key',
    model: 'test/model',
    appUrl: 'http://localhost:5173',
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'respuesta' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });

  assert.equal(
    await client.complete([message], { sessionId: 'agent-1' }),
    'respuesta',
  );
  assert.ok(captured);
  assert.equal(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  const headers = captured.options?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer test-key');
  assert.equal(headers['HTTP-Referer'], 'http://localhost:5173');
  assert.deepEqual(JSON.parse(String(captured.options?.body)), {
    model: 'test/model',
    messages: [message],
    session_id: 'agent-1',
  });
});

test('traduce autenticación, rate limit y respuestas vacías', async () => {
  const cases: ReadonlyArray<{
    status: number;
    body: unknown;
    code: string;
  }> = [
    {
      status: 401,
      body: { error: { message: 'bad key' } },
      code: 'OPENROUTER_AUTHENTICATION_REQUIRED',
    },
    {
      status: 429,
      body: { error: { message: 'slow down' } },
      code: 'OPENROUTER_RATE_LIMITED',
    },
    {
      status: 200,
      body: { choices: [{ message: { content: '' } }] },
      code: 'OPENROUTER_EMPTY_RESPONSE',
    },
  ];

  for (const fixture of cases) {
    const client = new OpenRouterClient({
      apiKey: 'test-key',
      fetchImpl: async () =>
        new Response(JSON.stringify(fixture.body), {
          status: fixture.status,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    await assert.rejects(
      client.complete([message], { sessionId: 'agent-1' }),
      { code: fixture.code },
    );
  }
});

test('cancela solicitudes que exceden el timeout', async () => {
  const client = new OpenRouterClient({
    apiKey: 'test-key',
    requestTimeoutMs: 15,
    fetchImpl: async (_url, options) =>
      new Promise((_resolve, reject) => {
        const signal = options?.signal;
        assert.ok(signal);
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  });

  await assert.rejects(
    client.complete([message], { sessionId: 'agent-1' }),
    OpenRouterTimeoutError,
  );
});
