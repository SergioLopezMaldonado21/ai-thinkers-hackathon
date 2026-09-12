import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OpenRouterAuthenticationError,
  OpenRouterClient,
  OpenRouterTimeoutError,
} from '../openrouter-client.mjs';

test('requiere la API key sin hacer una solicitud de red', async () => {
  let called = false;
  const client = new OpenRouterClient({ apiKey: '', fetchImpl: async () => { called = true; } });
  await assert.rejects(client.complete([{ role: 'user', content: 'hola' }]), OpenRouterAuthenticationError);
  assert.equal(called, false);
});

test('envía el historial y la sesión al endpoint de chat completions', async () => {
  let captured;
  const client = new OpenRouterClient({
    apiKey: 'test-key',
    model: 'test/model',
    appUrl: 'http://localhost:5173',
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'respuesta' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const messages = [{ role: 'user', content: 'hola' }];
  assert.equal(await client.complete(messages, { sessionId: 'agent-1' }), 'respuesta');
  assert.equal(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  assert.equal(captured.options.headers['HTTP-Referer'], 'http://localhost:5173');
  assert.deepEqual(JSON.parse(captured.options.body), { model: 'test/model', messages, session_id: 'agent-1' });
});

test('traduce autenticación, rate limit y respuestas vacías', async () => {
  const cases = [
    [401, { error: { message: 'bad key' } }, 'OPENROUTER_AUTHENTICATION_REQUIRED'],
    [429, { error: { message: 'slow down' } }, 'OPENROUTER_RATE_LIMITED'],
    [200, { choices: [{ message: { content: '' } }] }, 'OPENROUTER_EMPTY_RESPONSE'],
  ];
  for (const [status, body, code] of cases) {
    const client = new OpenRouterClient({
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    });
    await assert.rejects(client.complete([{ role: 'user', content: 'hola' }]), { code });
  }
});

test('cancela solicitudes que exceden el timeout', async () => {
  const client = new OpenRouterClient({
    apiKey: 'test-key',
    requestTimeoutMs: 15,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  });
  await assert.rejects(client.complete([{ role: 'user', content: 'hola' }]), OpenRouterTimeoutError);
});
