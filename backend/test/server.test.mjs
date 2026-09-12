import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterAuthenticationError, OpenRouterTimeoutError } from '../openrouter-client.mjs';
import { createApiServer } from '../server.mjs';

async function withServer(openRouterClient, run) {
  let sequence = 0;
  const server = createApiServer({
    openRouterClient,
    createId: () => `id-${++sequence}`,
    logger: { error() {} },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function post(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('crea IDs locales y conserva historiales independientes', async () => {
  const calls = [];
  const client = {
    async complete(messages, options) {
      calls.push({ messages: structuredClone(messages), options });
      return `respuesta-${calls.length}`;
    },
  };
  await withServer(client, async (baseUrl) => {
    const first = await post(baseUrl, '/api/chats');
    const second = await post(baseUrl, '/api/chats');
    assert.deepEqual(first, { status: 201, body: { allowed: true, agent: { id: 'agent_id-1' } } });
    assert.deepEqual(second.body.agent, { id: 'agent_id-2' });

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
    messages: [{ role: 'user', content: 'uno' }],
    options: { sessionId: 'agent_id-1' },
  });
  assert.deepEqual(calls[1].messages, [{ role: 'user', content: 'otro' }]);
  assert.deepEqual(calls[2].messages, [
    { role: 'user', content: 'uno' },
    { role: 'assistant', content: 'respuesta-1' },
    { role: 'user', content: 'dos' },
  ]);
});

test('bloquea sólo el agente que tiene una respuesta activa', async () => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const client = {
    async complete(messages) {
      if (messages.at(-1).content === 'espera') return held;
      return 'libre';
    },
  };
  await withServer(client, async (baseUrl) => {
    await post(baseUrl, '/api/chats');
    await post(baseUrl, '/api/chats');
    const pending = post(baseUrl, '/api/message/agent_id-1', { message: 'espera' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await post(baseUrl, '/api/message/agent_id-1', { message: 'duplicado' })).status, 409);
    assert.equal((await post(baseUrl, '/api/message/agent_id-2', { message: 'paralelo' })).status, 200);
    release('terminado');
    assert.equal((await pending).body.reply, 'terminado');
  });
});

test('mapea autenticación y timeout al contrato HTTP', async () => {
  let error = new OpenRouterAuthenticationError();
  const client = { async complete() { throw error; } };
  await withServer(client, async (baseUrl) => {
    await post(baseUrl, '/api/chats');
    assert.equal((await post(baseUrl, '/api/message/agent_id-1', { message: 'uno' })).status, 401);
    error = new OpenRouterTimeoutError();
    assert.equal((await post(baseUrl, '/api/message/agent_id-1', { message: 'dos' })).status, 504);
  });
});
