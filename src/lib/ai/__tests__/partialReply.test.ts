import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partialReply } from '../partialReply';

const BS = '\\'; // one backslash, as it appears inside the model's JSON

test('returns nothing before the reply field starts', () => {
  assert.equal(partialReply(''), '');
  assert.equal(partialReply('{"rep'), '');
  assert.equal(partialReply('{"reply":'), '');
});

test('decodes a reply that is still arriving', () => {
  assert.equal(partialReply('{"reply":"Hello, I fil'), 'Hello, I fil');
  assert.equal(partialReply('{"reply": "Done."'), 'Done.');
});

test('stops at the closing quote and ignores the draft after it', () => {
  assert.equal(partialReply('{"reply":"Got it.","details":{"name":"Walk"}}'), 'Got it.');
});

test('decodes escapes, and waits for an escape that is cut off', () => {
  assert.equal(partialReply(`{"reply":"Line one${BS}nLine ${BS}"two${BS}""`), 'Line one\nLine "two"');
  assert.equal(partialReply(`{"reply":"Price ${BS}u20b9500`), 'Price ₹500');
  assert.equal(partialReply(`{"reply":"Ends with ${BS}`), 'Ends with ');
  assert.equal(partialReply(`{"reply":"Rupee ${BS}u20`), 'Rupee ');
});

test('grows monotonically as more JSON arrives', () => {
  const full = JSON.stringify({ reply: 'Hi! "Aram" walk is on Sat.\n- Venue? ₹500', details: {} });
  let prev = '';
  for (let i = 0; i <= full.length; i++) {
    const now = partialReply(full.slice(0, i));
    assert.ok(now.startsWith(prev), `prefix broke at ${i}`);
    prev = now;
  }
  assert.equal(prev, 'Hi! "Aram" walk is on Sat.\n- Venue? ₹500');
});
