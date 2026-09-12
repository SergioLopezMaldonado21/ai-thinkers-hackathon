import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { OfficeRegistry } from '../src/application/office-registry.js';
import { createApiServer } from '../src/http/api-server.js';

const profile = {
  name: 'Ada', position: 'Coordinadora', responsibilities: 'Coordinar el equipo.',
  limitations: 'No inventar datos.', deliverables: 'Plan verificado.', skills: ['Síntesis'],
  operationalRole: 'coordinator', thinkingRole: 'analyst',
};

test('crea oficinas y aísla agentes, historiales y rutas', async () => {
  let sequence = 0;
  const registry = new OfficeRegistry({ async complete() { return 'respuesta'; } }, () => String(++sequence));
  const defaultOffice = registry.get(registry.defaultOfficeId);
  const server = createApiServer({
    conversations: defaultOffice.conversations, office: defaultOffice.office, offices: registry,
    allowedOrigin: 'http://localhost:5173', maxBodyBytes: 65536, logger: { error() {} },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };
  try {
    const marketing = await request('/api/offices', 'POST', { name: 'Marketing', emoji: '🎨' });
    const support = await request('/api/offices', 'POST', { name: 'Soporte', emoji: '🛟' });
    assert.equal(marketing.status, 201);
    assert.equal(support.status, 201);
    const marketingId = (marketing.body.office as { id: string }).id;
    const supportId = (support.body.office as { id: string }).id;

    const first = await request(`/api/offices/${marketingId}/chats`, 'POST', profile);
    const second = await request(`/api/offices/${supportId}/chats`, 'POST', { ...profile, name: 'Beto' });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const firstId = (first.body.agent as { id: string }).id;
    const secondId = (second.body.agent as { id: string }).id;

    const marketingState = await request(`/api/offices/${marketingId}/office`);
    const supportState = await request(`/api/offices/${supportId}/office`);
    assert.deepEqual((marketingState.body.agents as Array<{ profile: { name: string } }>).map((agent) => agent.profile.name), ['Ada']);
    assert.deepEqual((supportState.body.agents as Array<{ profile: { name: string } }>).map((agent) => agent.profile.name), ['Beto']);
    assert.equal((await request(`/api/offices/${marketingId}/message/${firstId}`, 'POST', { message: 'plan' })).status, 200);
    assert.equal(((await request(`/api/offices/${marketingId}/chats/${firstId}/messages`)).body.messages as unknown[]).length, 2);
    assert.equal(((await request(`/api/offices/${supportId}/chats/${secondId}/messages`)).body.messages as unknown[]).length, 0);
    assert.equal((await request(`/api/offices/${supportId}/message/${firstId}`, 'POST', { message: 'hola' })).status, 404);

    const legacy = await request('/api/chats', 'POST', { ...profile, name: 'Principal' });
    assert.equal(legacy.status, 201);
    assert.equal(((await request('/api/offices/default/office')).body.agents as unknown[]).length, 1);
    assert.equal((await request('/api/offices', 'POST', { name: 'marketing' })).status, 409);
    assert.equal((await request('/api/offices/no-existe/office')).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
