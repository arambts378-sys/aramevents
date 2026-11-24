import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, formatDateRange, formatTimeRange, withDisplayDateTime } from '../displayDateTime';

test('24-hour times read as 12-hour clock times', () => {
  assert.equal(formatClock('09:00:00'), '9:00 am');
  assert.equal(formatClock('18:00:00'), '6:00 pm');
  assert.equal(formatClock('00:30'), '12:30 am');
  assert.equal(formatClock('12:00'), '12:00 pm');
  assert.equal(formatTimeRange('09:00:00', '18:00:00'), '9:00 am – 6:00 pm');
});

test('a one-day event shows its date once', () => {
  assert.equal(formatDateRange('2026-11-25', '2026-11-25'), '25 November 2026');
  assert.equal(formatDateRange('2026-11-25', '2026-11-26'), '25–26 November 2026');
  assert.equal(formatDateRange('2026-11-30', '2026-12-02'), '30 November – 2 December 2026');
  assert.equal(formatDateRange('2026-12-31', '2027-01-01'), '31 December 2026 – 1 January 2027');
});

test('the public page shape gets readable date and time plus the raw fields', () => {
  const e = withDisplayDateTime({ date: '2026-11-25 - 2026-11-25', time: '09:00:00 - 18:00:00' });
  assert.equal(e.date, '25 November 2026');
  assert.equal(e.time, '9:00 am – 6:00 pm');
  assert.equal(e.startDate, '2026-11-25');
  assert.equal(e.startTime, '09:00:00');
  assert.equal(e.endTime, '18:00:00');
});

test('missing values say so instead of printing "undefined"', () => {
  const e = withDisplayDateTime({ date: 'undefined - undefined', time: 'undefined - undefined' });
  assert.equal(e.date, 'Date to be announced');
  assert.equal(e.time, 'Time to be announced');
});
