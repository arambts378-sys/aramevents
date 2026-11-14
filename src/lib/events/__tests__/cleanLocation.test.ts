import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanLocation } from '../cleanLocation';

test('drops day and time-zone fragments a flyer read left in the location', () => {
  assert.equal(cleanLocation('(Tuesday) (IST), Chennai'), 'Chennai');
  assert.equal(cleanLocation('HICC, Hyderabad (IST)'), 'HICC, Hyderabad');
  assert.equal(cleanLocation('T-Hub (Sat), Hyderabad'), 'T-Hub, Hyderabad');
});

test('leaves real venues alone', () => {
  assert.equal(cleanLocation('The Grand Convention Centre, Chennai'), 'The Grand Convention Centre, Chennai');
  assert.equal(cleanLocation('Hall 3 (Level 2), Bengaluru'), 'Hall 3 (Level 2), Bengaluru');
});

test('empty input', () => {
  assert.equal(cleanLocation(null), '');
  assert.equal(cleanLocation('(Monday)'), '');
});
