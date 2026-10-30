import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFlyerDraft } from '../validateFlyerDraft';
import type { AgentTurn } from '../eventDraft';

const FLYER = `RUN FOR HOPE 2026
Charity Walkathon
Saturday, 12 December
Flag-off 6:00 AM | Reporting 5:30 AM
KBR Park, Jubilee Hills, Hyderabad
5K – ₹500 | 10K – ₹1,200
Contact: hello@runforhope.org`;

function draft(overrides: Partial<AgentTurn['details']> = {}): AgentTurn['details'] {
  return {
    name: 'Run For Hope 2026',
    description: null,
    eventType: 'Walkathon',
    format: 'In-person',
    startDate: '2026-12-12',
    endDate: null,
    startTime: '06:00',
    endTime: null,
    timezone: 'Asia/Kolkata',
    venue: 'KBR Park, Jubilee Hills',
    city: 'Hyderabad',
    capacity: null,
    contactEmail: 'hello@runforhope.org',
    ticketTypes: [
      { name: '5K', price: 500, currency: 'INR', capacity: null, description: null },
      { name: '10K', price: 1200, currency: 'INR', capacity: null, description: null },
    ],
    uncertainFields: [],
    confidence: 0.95,
    ...overrides,
  };
}

const facts = { transcription: FLYER, statedWeekday: 'Saturday', yearStated: false, today: '2026-10-30' };

test('a faithful draft passes untouched apart from the one-day end date', () => {
  const { details, issues } = validateFlyerDraft(draft(), facts);
  assert.deepEqual(issues, []);
  assert.equal(details.endDate, '2026-12-12');
  assert.equal(details.confidence, 0.95);
});

test('a printed weekday picks the year when the flyer prints none', () => {
  // 12 December is a Saturday in 2026; the model guessed 2027, a Sunday
  const { details, issues } = validateFlyerDraft(draft({ startDate: '2027-12-12' }), facts);
  assert.deepEqual(issues, []);
  assert.equal(details.startDate, '2026-12-12');
});

test('a weekday that contradicts a printed year is sent back for a recheck', () => {
  const { issues } = validateFlyerDraft(draft({ startDate: '2026-12-13' }), { ...facts, yearStated: true });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, 'startDate');
  assert.equal(issues[0].recheck, true);
});

test('a past date with no printed year moves to next year', () => {
  const { details } = validateFlyerDraft(draft({ startDate: '2026-03-14' }), { ...facts, statedWeekday: null });
  assert.equal(details.startDate, '2027-03-14');
});

test('impossible dates and times are cleared, not kept', () => {
  const { details, issues } = validateFlyerDraft(draft({ startDate: '2026-02-30', startTime: '6 AM' }), facts);
  assert.equal(details.startDate, null);
  assert.equal(details.startTime, null);
  assert.ok(issues.every((i) => i.recheck));
});

test('values not printed on the flyer are flagged', () => {
  const { details, issues } = validateFlyerDraft(
    draft({
      contactEmail: 'hello@runforhope.com',
      capacity: 300,
      ticketTypes: [{ name: '5K', price: 550, currency: 'INR', capacity: null, description: null }],
    }),
    facts,
  );
  assert.deepEqual(issues.map((i) => i.field).sort(), ['capacity', 'contactEmail', 'ticketTypes']);
  assert.ok(details.uncertainFields.includes('contactEmail'));
  assert.ok(details.confidence < 0.95);
});

test('an end before the start is flagged', () => {
  const { issues } = validateFlyerDraft(draft({ endTime: '05:00' }), facts);
  assert.equal(issues[0].field, 'endTime');
});

test('a made-up event name is flagged', () => {
  const { issues } = validateFlyerDraft(draft({ name: 'Hyderabad Marathon Festival' }), facts);
  assert.equal(issues[0].field, 'name');
});
