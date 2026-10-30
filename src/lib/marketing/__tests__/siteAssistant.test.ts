import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackAnswer } from '../siteAssistant';

const says = (q: string, ...needles: string[]) => {
  const a = fallbackAnswer(q);
  for (const n of needles) assert.ok(a.toLowerCase().includes(n.toLowerCase()), `"${q}" -> "${a}" should mention "${n}"`);
};

test('greets back on hi, hello and local greetings', () => {
  for (const q of ['hi', 'Hello!', 'hey', 'good morning', 'vanakkam', 'namaste']) says(q, 'Hello', 'Aram Assist');
});

test('greets and answers when a greeting comes with a question', () => {
  says('hey, how much does it cost?', 'Hi there', '₹1,499');
  says('hi there, how does qr check-in work', 'Hi there', 'scan');
});

test('handles small talk', () => {
  says('how are you', 'doing great');
  says('thanks', 'welcome');
  says('bye', 'thanks for stopping by');
  says('who are you', 'Aram Assist');
  says('ok', 'anything else');
});

test('recommends a plan from the attendee count', () => {
  says('we expect 80 people', 'Free');
  says('we expect 600 people', 'Professional', '₹3,999');
  says('around 3,000 attendees', 'Business');
  says('12000 guests', 'Enterprise');
});

test('answers about named plans and pricing', () => {
  says('what is the business plan', 'Business is ₹9,999');
  says('what is in essential', '₹1,499');
  says('how much is it', 'per event');
});

test('explains product features from the website', () => {
  says('can I sell paid tickets?', 'payment gateway');
  says('how do I create an event', '/organizer/register', 'template');
  says('can I upload my flyer', 'reads it');
  says('can I change the website colours', '12 templates');
  says('how do I register for an event', '/live-events');
  says('I did not get my ticket', 'spam');
  says('how do I get a refund', 'organizer');
  says('how does qr check-in work', 'scan');
  says('how do I download the attendee list', 'CSV');
  says('can i add volunteers', 'role');
  says('do you support walkathons', 'distance');
  says('is my data safe', '/privacy');
  says('forgot password', '/login');
  says('talk to sales', '/contact');
  says('what is aram', 'one platform');
});

test('falls back with a helpful prompt for unknown input', () => {
  says('blah blah', 'tell me a little more');
});
