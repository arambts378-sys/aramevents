import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SETUP_STEPS,
  completedSetupSteps,
  isReadyToGoLive,
  nextSetupStep,
  setupStepHref,
  setupStepIndex,
  type SetupProgress,
} from '../setupSteps';

const progress = (overrides: Partial<SetupProgress> = {}): SetupProgress => ({
  details: true,
  website: false,
  registration: false,
  tickets: false,
  people: false,
  sponsors: false,
  access: false,
  ...overrides,
});

describe('event setup steps', () => {
  it('runs from details through website, registration, tickets, people and QR access', () => {
    assert.deepEqual(SETUP_STEPS.map((s) => s.id), ['details', 'website', 'registration', 'tickets', 'people', 'sponsors', 'access']);
  });

  it('finds the step for a page, and none for the workspace or unrelated tools', () => {
    assert.equal(setupStepIndex('/app/events/abc/tickets', 'abc'), 3);
    assert.equal(setupStepIndex('/app/events/abc/operations/access-control', 'abc'), 6);
    assert.equal(setupStepIndex('/app/events/abc', 'abc'), -1);
    assert.equal(setupStepIndex('/app/events/abc/analytics', 'abc'), -1);
    assert.equal(setupStepIndex('/app/events/abc/website/preview', 'abc'), -1);
  });

  it('builds links under the event', () => {
    assert.equal(setupStepHref(SETUP_STEPS[1], 'abc'), '/app/events/abc/website/editor');
    assert.equal(setupStepHref(SETUP_STEPS[0], 'abc'), '/app/events/abc');
  });

  it('points at the first unfinished step, even when a later one is done', () => {
    assert.equal(nextSetupStep(progress({ registration: true }))?.id, 'website');
    assert.equal(nextSetupStep(progress({ website: true, registration: true }))?.id, 'tickets');
  });

  it('has no next step once everything is done', () => {
    const done = progress({ website: true, registration: true, tickets: true, people: true, sponsors: true, access: true });
    assert.equal(nextSetupStep(done), null);
    assert.equal(completedSetupSteps(done), SETUP_STEPS.length);
  });

  it('is ready to go live with optional steps still open, but not with required ones', () => {
    assert.equal(isReadyToGoLive(progress({ website: true, registration: true, tickets: true })), true);
    assert.equal(isReadyToGoLive(progress({ website: true, tickets: true })), false);
  });
});
