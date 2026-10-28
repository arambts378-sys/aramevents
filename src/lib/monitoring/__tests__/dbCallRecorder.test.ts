import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyTarget } from '../dbCallRecorder';
import { classifySurface } from '../surfaces';

const base = 'https://example.supabase.co';

test('classifies PostgREST tables and RPCs without query strings', () => {
  assert.deepEqual(classifyTarget(`${base}/rest/v1/registrations?select=*&email=eq.a@b.com`), {
    kind: 'table',
    target: 'registrations',
  });
  assert.deepEqual(classifyTarget(`${base}/rest/v1/rpc/has_platform_permission`), {
    kind: 'rpc',
    target: 'has_platform_permission',
  });
});

test('never records the metrics ingest call or realtime', () => {
  assert.equal(classifyTarget(`${base}/rest/v1/rpc/ingest_platform_db_call_metrics`), null);
  assert.equal(classifyTarget(`${base}/realtime/v1/websocket`), null);
  assert.equal(classifyTarget('not a url'), null);
});

test('classifies auth endpoints and storage buckets', () => {
  assert.deepEqual(classifyTarget(`${base}/auth/v1/user`), { kind: 'auth', target: 'user' });
  assert.deepEqual(classifyTarget(`${base}/auth/v1/admin/users/123`), { kind: 'auth', target: 'admin/users' });
  assert.deepEqual(classifyTarget(`${base}/storage/v1/object/event-flyers/a/b.png`), {
    kind: 'storage',
    target: 'event-flyers',
  });
  assert.deepEqual(classifyTarget(`${base}/storage/v1/object/public/event-flyers/a.png`), {
    kind: 'storage',
    target: 'event-flyers',
  });
});

test('maps request paths to application surfaces', () => {
  assert.equal(classifySurface('/super-admin/monitoring'), 'admin');
  assert.equal(classifySurface('/app/events/abc/check-in'), 'checkin');
  assert.equal(classifySurface('/app/events/abc/people'), 'organizer');
  assert.equal(classifySurface('/api/events/abc/check-in'), 'checkin');
  assert.equal(classifySurface('/api/integrations/process'), 'jobs');
  assert.equal(classifySurface('/events/walkathon/register'), 'public');
  assert.equal(classifySurface('/api/organizer/register'), 'auth');
  assert.equal(classifySurface('/pricing'), 'marketing');
  assert.equal(classifySurface(''), 'other');
});
