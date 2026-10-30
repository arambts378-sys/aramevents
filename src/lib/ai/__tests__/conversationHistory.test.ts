import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conversationTitle,
  fromStored,
  groupConversations,
  toStored,
  type HistoryMessage,
} from '../conversationHistory';

const msg = (role: 'user' | 'assistant', content: string, extra: Partial<HistoryMessage> = {}): HistoryMessage => ({
  id: Math.random().toString(36).slice(2),
  role,
  content,
  timestamp: new Date('2026-10-30T10:00:00Z'),
  ...extra,
});

test('stored messages drop the flyer image but keep its name', () => {
  const big = `data:image/jpeg;base64,${'A'.repeat(50_000)}`;
  const stored = toStored([msg('user', 'Here is the flyer', { attachment: { name: 'summit.png', url: big } })]);
  assert.deepEqual(stored[0].attachment, { name: 'summit.png' });
  assert.ok(!JSON.stringify(stored).includes('base64'));
  assert.equal(stored[0].timestamp, '2026-10-30T10:00:00.000Z');
});

test('restored messages come back with Date timestamps and an empty image url', () => {
  const restored = fromStored(toStored([msg('user', 'hi', { attachment: { name: 'a.png', url: 'data:x' } }), msg('assistant', 'Hello')]));
  assert.equal(restored.length, 2);
  assert.ok(restored[0].timestamp instanceof Date);
  assert.deepEqual(restored[0].attachment, { name: 'a.png', url: '' });
  assert.equal(restored[1].role, 'assistant');
});

test('restoring ignores malformed rows', () => {
  assert.deepEqual(fromStored(null), []);
  assert.deepEqual(fromStored([null, { role: 'user' }, 42]), []);
});

test('only the latest 200 messages are stored', () => {
  const many = Array.from({ length: 250 }, (_, i) => msg('user', `m${i}`));
  const stored = toStored(many);
  assert.equal(stored.length, 200);
  assert.equal(stored[0].content, 'm50');
});

test('title prefers the event name, then the flyer, then the first message', () => {
  assert.equal(conversationTitle([], null), 'New chat');
  assert.equal(conversationTitle([msg('user', '  Tech   conference in Hyderabad ')], null), 'Tech conference in Hyderabad');
  assert.equal(
    conversationTitle([msg('user', 'Here is the flyer', { attachment: { name: 'Product Summit.jpeg', url: '' } })], null),
    'Flyer: Product Summit',
  );
  assert.equal(conversationTitle([msg('user', 'anything')], { name: 'Chennai Product Summit' } as never), 'Chennai Product Summit');
  const long = conversationTitle([msg('user', 'x'.repeat(200))], null);
  assert.ok(long.length <= 80 && long.endsWith('…'));
});

test('chats are grouped like ChatGPT, newest first', () => {
  const now = new Date('2026-10-30T15:00:00');
  const at = (d: string) => new Date(d).toISOString();
  const groups = groupConversations(
    [
      { id: 'old', title: 'Old', updated_at: at('2026-08-01T10:00:00'), created_event_id: null },
      { id: 'today2', title: 'Today 2', updated_at: at('2026-10-30T14:00:00'), created_event_id: null },
      { id: 'yday', title: 'Yesterday', updated_at: at('2026-10-29T09:00:00'), created_event_id: null },
      { id: 'today1', title: 'Today 1', updated_at: at('2026-10-30T09:00:00'), created_event_id: null },
      { id: 'week', title: 'Week', updated_at: at('2026-10-26T09:00:00'), created_event_id: null },
      { id: 'month', title: 'Month', updated_at: at('2026-10-10T09:00:00'), created_event_id: null },
    ],
    now,
  );
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ['Today', ['today2', 'today1']],
      ['Yesterday', ['yday']],
      ['Previous 7 days', ['week']],
      ['Previous 30 days', ['month']],
      ['Older', ['old']],
    ],
  );
});
