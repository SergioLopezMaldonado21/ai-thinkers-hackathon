import assert from 'node:assert/strict';
import test from 'node:test';
import { ConversationStore } from './conversation-store.ts';

test('keeps messages and pending state independent by thread', () => {
  const store = new ConversationStore();
  assert.equal(store.startTurn('thread-a', 'A1'), true);
  assert.equal(store.startTurn('thread-b', 'B1'), true);
  store.finishTurn('thread-b', 'B2');

  assert.deepEqual(store.get('thread-a'), {
    messages: [{ role: 'user', text: 'A1' }],
    pending: true,
  });
  assert.deepEqual(store.get('thread-b'), {
    messages: [{ role: 'user', text: 'B1' }, { role: 'agent', text: 'B2' }],
    pending: false,
  });
});

test('blocks a second turn only on the thread that is pending', () => {
  const store = new ConversationStore();
  assert.equal(store.startTurn('thread-a', 'first'), true);
  assert.equal(store.startTurn('thread-a', 'duplicate'), false);
  assert.equal(store.startTurn('thread-b', 'concurrent'), true);
  assert.deepEqual(store.get('thread-a').messages, [{ role: 'user', text: 'first' }]);
});

test('preserves history and appends a visible error when a turn fails', () => {
  const store = new ConversationStore();
  store.startTurn('thread-a', 'question');
  store.failTurn('thread-a', 'connection error');
  assert.deepEqual(store.get('thread-a'), {
    messages: [{ role: 'user', text: 'question' }, { role: 'error', text: 'connection error' }],
    pending: false,
  });
});
