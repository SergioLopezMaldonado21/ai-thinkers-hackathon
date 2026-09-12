import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { ConversationService } from '../src/application/conversation-service.js';
import { OfficeCoordinationService } from '../src/application/office-coordination-service.js';
import type { AgentProfile } from '../src/domain/agent-profile.js';
import type { ChatMessage } from '../src/domain/chat.js';
import { createApiServer } from '../src/http/api-server.js';

const profile: AgentProfile = {
  name: 'Ada', position: 'Investigación', responsibilities: 'Investigar', limitations: 'No inventar',
  deliverables: 'Informe', skills: ['Síntesis'], operationalRole: 'researcher_intel', thinkingRole: 'analyst',
};
interface Context {
  agentId: string; bossId: string | null; replyTo: string | null; task: string; round: number; finalOnly: boolean;
  availableSubordinates: Array<{ id: string; remainingExchanges: number }>;
  results: Array<{ subordinateId: string; response: string; status: string }>;
  memory: unknown;
}
const done = (answer: string, memory?: unknown) => JSON.stringify({ action: 'self', answer, requests: [], memory });
const delegate = (subordinateId: string) => JSON.stringify({ action: 'delegate', answer: '', requests: [{ subordinateId, task: 'Investiga el tema' }] });

function setup(handler: (context: Context, messages: readonly ChatMessage[]) => string | Promise<string>, timeoutMs = 1000) {
  let sequence = 0;
  const nextId = () => String(++sequence);
  const conversations = new ConversationService({
    async complete(messages) { return handler(JSON.parse(messages.at(-1)!.content) as Context, messages); },
  }, nextId);
  const office = new OfficeCoordinationService(conversations, nextId, timeoutMs);
  const root = conversations.createConversation(profile);
  const first = conversations.createConversation({ ...profile, name: 'Beto' });
  const second = conversations.createConversation({ ...profile, name: 'Celia' });
  const connections = [
    { id: 'edge1', bossId: root, subordinateId: first },
    { id: 'edge2', bossId: root, subordinateId: second },
  ];
  office.setTree({ rootId: root, connections });
  return { office, conversations, root, first, second, connections };
}

test('self does not consult and bounded memory is recalled only in its own scope', async () => {
  const contexts: Context[] = [];
  const app = setup((context) => {
    contexts.push(context);
    return done('Resuelto', { summary: 'x'.repeat(900), facts: Array(20).fill('aprendizaje'), openQuestions: Array(10).fill('pendiente') });
  });
  assert.equal((await app.office.sendMessage(app.root, 'Una tarea')).reply, 'Resuelto');
  assert.equal(app.office.getCommunications().length, 0);
  const memory = app.office.getMemory(app.root)!;
  assert.equal(memory.summary.length, 600);
  assert.equal(memory.facts.length, 5);
  assert.equal(memory.openQuestions.length, 3);
  await app.office.sendMessage(app.root, 'Otra tarea');
  assert.deepEqual(contexts[1]?.memory, memory);
  assert.equal(app.office.getMemory(app.root, 'office'), null);
});

test('selective delegation isolates personal histories and personal memory from internal prompts', async () => {
  let app: ReturnType<typeof setup>;
  const internalPrompts: string[] = [];
  app = setup((context, messages) => {
    if (context.task === 'PRIVATE_SECRET') return done('Respuesta privada', { summary: 'PRIVATE_MEMORY' });
    if (context.agentId === app.root) return context.results.length ? done('Informe integrado') : delegate(app.first);
    assert.equal(context.bossId, app.root);
    assert.equal(context.replyTo, app.root);
    internalPrompts.push(JSON.stringify(messages));
    return done('Hallazgo público', { summary: 'Investigación pública' });
  });
  await app.office.sendMessage(app.first, 'PRIVATE_SECRET');
  const history = app.conversations.getConversation(app.first).messages;
  await app.office.sendMessage(app.root, 'Investiga');
  assert.deepEqual(app.conversations.getConversation(app.first).messages, history);
  assert.equal(internalPrompts.length, 1);
  assert.ok(!internalPrompts[0]!.includes('PRIVATE_SECRET'));
  assert.ok(!internalPrompts[0]!.includes('PRIVATE_MEMORY'));
  const exchanges = app.office.getCommunications();
  assert.equal(exchanges.length, 1);
  assert.equal(exchanges[0]?.subordinateId, app.first);
  assert.equal(exchanges[0]?.status, 'completed');
  assert.equal(app.office.getMemory(app.first)?.summary, 'PRIVATE_MEMORY');
  assert.equal(app.office.getMemory(app.first, 'office')?.summary, 'Investigación pública');
});

test('nested delegation shares four exchanges per edge across repeated invocations and forces synthesis', async () => {
  let app: ReturnType<typeof setup>;
  const calls: Context[] = [];
  app = setup((context) => {
    calls.push(context);
    if (context.agentId === app.second) return done('Dato');
    // Deliberately ignore finalOnly: the server must still stop delegation.
    return delegate(context.agentId === app.root ? app.first : app.second);
  });
  app.office.setTree({ rootId: app.root, connections: [app.connections[0], { id: 'deep', bossId: app.first, subordinateId: app.second }] });
  const result = await app.office.sendMessage(app.root, 'Necesito un acuerdo');
  assert.match(result.reply, /Coordinación cerrada/);
  for (const edgeId of ['edge1', 'deep']) assert.equal(app.office.getCommunications().filter((item) => item.edgeId === edgeId).length, 4);
  assert.ok(calls.length < 20);
  assert.deepEqual(app.office.getSnapshot().activeAgentIds, []);
});

test('invalid recipients cannot trigger calls outside hierarchy', async () => {
  let app: ReturnType<typeof setup>;
  app = setup(() => delegate('invented'));
  await assert.rejects(app.office.sendMessage(app.root, 'Tarea'), /destinatario no permitido/);
  assert.equal(app.office.getCommunications().length, 0);
  assert.deepEqual(app.office.getSnapshot().activeAgentIds, []);
});

test('tree replacement is atomic and rejects cycles, unknown agents and multiple bosses', () => {
  const app = setup(() => done('ok'));
  const snapshot = app.office.getSnapshot();
  assert.throws(() => app.office.setTree({ rootId: app.root, connections: [
    ...app.connections, { id: 'cycle', bossId: app.first, subordinateId: app.root },
  ] }));
  assert.throws(() => app.office.setTree({ rootId: app.root, connections: [
    ...app.connections, { id: 'duplicate', bossId: app.first, subordinateId: app.second },
  ] }));
  assert.throws(() => app.office.setTree({ rootId: app.root, connections: [{ id: 'bad', bossId: app.root, subordinateId: 'unknown' }] }));
  assert.deepEqual(app.office.getSnapshot(), snapshot);
});

test('pending is observable, overlapping human chat/tree mutations are rejected and child errors close audit', async () => {
  let signalStarted!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  let rejectChild!: (error: Error) => void;
  let app: ReturnType<typeof setup>;
  app = setup((context) => {
    if (context.agentId === app.root) return context.results.length ? done(`Terminé con ${context.results[0]!.status}`) : delegate(app.first);
    signalStarted();
    return new Promise<string>((_, reject) => { rejectChild = reject; });
  });
  const pending = app.office.sendMessage(app.root, 'Ayuda');
  await started;
  assert.equal(app.office.getCommunications()[0]?.status, 'pending');
  assert.equal(app.office.getCommunications()[0]?.response, null);
  assert.deepEqual(new Set(app.office.getSnapshot().activeAgentIds), new Set([app.root, app.first]));
  await assert.rejects(app.office.sendMessage(app.first, 'Chat personal'), /ya está trabajando/);
  assert.throws(() => app.office.setTree({ rootId: app.root, connections: [] }), /termine la coordinación/);
  rejectChild(new Error('Internal credentials must not leak'));
  assert.equal((await pending).reply, 'Terminé con error');
  const communication = app.office.getCommunications()[0]!;
  assert.equal(communication.status, 'error');
  assert.ok(communication.completedAt);
  assert.ok(!communication.response!.includes('credentials'));
});

test('child timeout produces terminal audit and returns control to boss', async () => {
  let app: ReturnType<typeof setup>;
  app = setup((context) => {
    if (context.agentId === app.root) return context.results.length ? done('Información incompleta') : delegate(app.first);
    return new Promise<string>(() => {});
  }, 20);
  assert.equal((await app.office.sendMessage(app.root, 'Tarea')).reply, 'Información incompleta');
  assert.equal(app.office.getCommunications()[0]?.status, 'error');
  assert.deepEqual(app.office.getSnapshot().activeAgentIds, []);
});

test('HTTP exposes office, pair audit, human-only histories and PUT CORS', async () => {
  let app: ReturnType<typeof setup>;
  app = setup((context) => context.agentId === app.root && !context.results.length ? delegate(app.first) : done('Respuesta'));
  const server = createApiServer({ conversations: app.conversations, office: app.office, allowedOrigin: 'http://localhost:5173', maxBodyBytes: 65536, logger: { error() {} } });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${base}/api/message/${app.root}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hola' }) });
    assert.equal(response.status, 200);
    assert.ok((await response.json() as { runId: string }).runId);
    const childHistory = await (await fetch(`${base}/api/chats/${app.first}/messages`)).json();
    assert.deepEqual(childHistory, { messages: [], pending: false });
    const human = await (await fetch(`${base}/api/chats/${app.root}/messages`)).json();
    assert.deepEqual(human, { messages: [{ role: 'user', text: 'Hola' }, { role: 'agent', text: 'Respuesta' }], pending: false });
    const pair = await (await fetch(`${base}/api/communications?bossId=${app.root}&subordinateId=${app.first}`)).json() as { communications: unknown[] };
    assert.equal(pair.communications.length, 1);
    assert.equal((await fetch(`${base}/api/office`)).status, 200);
    const options = await fetch(`${base}/api/office/tree`, { method: 'OPTIONS' });
    assert.match(options.headers.get('Access-Control-Allow-Methods')!, /PUT/);
    assert.equal((await fetch(`${base}/api/office/tree`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rootId: app.root, connections: [] }) })).status, 200);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
