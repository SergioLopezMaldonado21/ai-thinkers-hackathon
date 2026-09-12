import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentTreeOrchestrator, type OrchestratorEvent } from '../src/application/agent-tree-orchestrator.js';
import { AgentTree } from '../src/domain/agent-tree.js';

function sequentialIds(): () => string {
  let value = 0;
  return () => String(++value);
}

test('construye un árbol con una raíz, un jefe por agente y capas adyacentes', () => {
  const tree = new AgentTree();
  tree.addRoot('root');
  tree.attachSubordinate({ edgeId: 'root-a', bossId: 'root', subordinateId: 'a' });
  tree.attachSubordinate({ edgeId: 'root-b', bossId: 'root', subordinateId: 'b' });
  tree.attachSubordinate({ edgeId: 'a-c', bossId: 'a', subordinateId: 'c' });

  assert.deepEqual(tree.getRelations('root'), {
    agentId: 'root',
    level: 0,
    bossId: null,
    subordinateIds: ['a', 'b'],
    subordinateIdsLifo: ['b', 'a'],
  });
  assert.deepEqual(tree.getRelations('c'), {
    agentId: 'c',
    level: 2,
    bossId: 'a',
    subordinateIds: [],
    subordinateIdsLifo: [],
  });

  assert.throws(() => tree.addRoot('other-root'), { code: 'AGENT_TREE_ROOT_EXISTS' });
  assert.throws(
    () => tree.attachSubordinate({ edgeId: 'b-c', bossId: 'b', subordinateId: 'c' }),
    { code: 'AGENT_TREE_SUBORDINATE_ALREADY_ATTACHED' },
  );
  assert.throws(
    () => tree.attachSubordinate({
      edgeId: 'invalid-limit',
      bossId: 'root',
      subordinateId: 'd',
      maxConversations: 0,
    }),
    { code: 'AGENT_TREE_CONVERSATION_LIMIT_INVALID' },
  );
});

test('activa subordinados en LIFO, espera sus respuestas y respeta cada presupuesto', async () => {
  const tree = new AgentTree();
  tree.addRoot('root');
  tree.attachSubordinate({
    edgeId: 'root-a',
    bossId: 'root',
    subordinateId: 'a',
    maxConversations: 2,
  });
  tree.attachSubordinate({
    edgeId: 'root-b',
    bossId: 'root',
    subordinateId: 'b',
    maxConversations: 1,
  });
  tree.attachSubordinate({
    edgeId: 'a-c',
    bossId: 'a',
    subordinateId: 'c',
    maxConversations: 2,
  });

  const calls: Array<{ agentId: string; childIds: string[]; round: number }> = [];
  const events: OrchestratorEvent[] = [];
  const orchestrator = new AgentTreeOrchestrator(
    tree,
    {
      async execute(agentId, _request, context) {
        calls.push({
          agentId,
          childIds: context.subordinateReplies.map((reply) => reply.agentId),
          round: context.round,
        });
        return `respuesta de ${agentId}`;
      },
    },
    sequentialIds(),
  );

  const result = await orchestrator.run('Resolver el problema', {
    rounds: 3,
    onEvent: (event) => events.push(event),
  });

  assert.equal(result.completedRounds, 2);
  assert.equal(result.rootReply.content, 'respuesta de root');
  assert.equal(result.conversations.length, 5);
  assert.deepEqual(
    result.edges.map((edge) => [edge.edgeId, edge.conversationsUsed, edge.status]),
    [
      ['root-a', 2, 'closed'],
      ['root-b', 1, 'closed'],
      ['a-c', 2, 'closed'],
    ],
  );
  assert.deepEqual(
    events
      .flatMap((event) =>
        event.type === 'conversation.requested' && event.bossId === 'root'
          ? [event.subordinateId]
          : [],
      ),
    ['b', 'a', 'a'],
  );
  assert.deepEqual(
    calls.filter((call) => call.agentId === 'root').map((call) => call.childIds),
    [['b', 'a'], ['a']],
  );
});

test('convierte el fallo de un subordinado en una respuesta terminal para su jefe', async () => {
  const tree = new AgentTree();
  tree.addRoot('root');
  tree.attachSubordinate({ edgeId: 'root-child', bossId: 'root', subordinateId: 'child' });

  let rootSawError = false;
  const orchestrator = new AgentTreeOrchestrator(
    tree,
    {
      async execute(agentId, _request, context) {
        if (agentId === 'child') throw new Error('fallo controlado');
        rootSawError = context.subordinateReplies[0]?.status === 'error';
        return 'respuesta final';
      },
    },
    sequentialIds(),
  );

  const result = await orchestrator.run('Tarea');

  assert.equal(rootSawError, true);
  assert.equal(result.rootReply.status, 'ok');
  assert.equal(result.conversations[0]?.response.status, 'error');
  assert.equal(result.conversations[0]?.response.content, 'fallo controlado');
  assert.equal(result.edges[0]?.status, 'closed');
});
