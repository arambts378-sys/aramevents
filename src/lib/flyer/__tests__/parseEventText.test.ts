import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findDates, findTimes, findTickets, findCapacity, mergeOcrPasses, parseFlyer, tidyTitle, type TextLine } from '../parseEventText';
import { localChatTurn, localFlyerTurn } from '../localAgent';

const today = '2026-10-30';
const opts = { today, timeZone: 'Asia/Kolkata' };

/** OCR lines; the first number is the line height in pixels */
const lines = (rows: [number, string][], confidence = 90): TextLine[] => rows.map(([height, text]) => ({ text, height, confidence }));

test('walkathon flyer', () => {
  const flyer = lines([
    [40, 'Hope Foundation presents'],
    [120, 'RUN FOR HOPE'],
    [110, '2026'],
    [50, 'Charity Walkathon'],
    [36, 'Saturday, 12th December'],
    [30, 'Reporting: 5:30 AM | Flag off: 6:00 AM'],
    [30, 'Venue: KBR Park, Road No. 2, Banjara Hills'],
    [30, 'Hyderabad - 500034'],
    [30, '5K - ₹500 | 10K - ₹1,200'],
    [24, 'Register: www.runforhope.org | hello@runforhope.org'],
    [24, 'Call +91 98480 12345'],
  ]);
  const { details, yearStated, statedWeekday } = parseFlyer(flyer, opts);
  assert.equal(details.name, 'Run for Hope');
  assert.equal(details.eventType, 'Walkathon');
  assert.equal(details.format, 'In-person');
  assert.equal(details.startDate, '2026-12-12');
  assert.equal(details.endDate, '2026-12-12');
  assert.equal(yearStated, false);
  assert.equal(statedWeekday, 'Saturday');
  assert.equal(details.startTime, '06:00');
  assert.equal(details.endTime, null);
  assert.equal(details.venue, 'KBR Park, Road No. 2, Banjara Hills');
  assert.equal(details.city, 'Hyderabad');
  assert.equal(details.timezone, 'Asia/Kolkata');
  assert.equal(details.contactEmail, 'hello@runforhope.org');
  assert.deepEqual(details.ticketTypes.map((t) => [t.name, t.price, t.currency]), [['5K', 500, 'INR'], ['10K', 1200, 'INR']]);
  assert.match(details.description!, /Hosted by Hope Foundation/);
  assert.match(details.description!, /Reporting: 5:30 AM/);
  assert.match(details.description!, /\+91 98480 12345/);
});

test('product launch poster, title completed from the file name', () => {
  const flyer = lines([
    [140, 'PRODUCT'],
    [140, 'LAUNCH'],
    [40, 'Aram Analytics'],
    [32, '15 Nov 2026 | 6:00 PM - 9:00 PM'],
    [28, 'The Westin, Hitec City, Hyderabad'],
    [24, 'Limited to 150 seats'],
    [24, 'RSVP: events@aramanalytics.com'],
  ]);
  const { details } = parseFlyer(flyer, { ...opts, fileName: 'Aram Analytics Product Launch Poster.png' });
  assert.equal(details.name, 'Aram Analytics Product Launch');
  assert.equal(details.eventType, 'Corporate Event');
  assert.equal(details.startDate, '2026-11-15');
  assert.equal(details.startTime, '18:00');
  assert.equal(details.endTime, '21:00');
  assert.equal(details.venue, 'The Westin, Hitec City');
  assert.equal(details.city, 'Hyderabad');
  assert.equal(details.capacity, 150);
  assert.equal(details.contactEmail, 'events@aramanalytics.com');
  assert.deepEqual(details.ticketTypes, []);
});

test('virtual webinar with a numeric date and OCR slips', () => {
  const flyer = lines([
    [90, 'Cloud Security Webinar'],
    [30, 'Date: 05/12/2O26'],
    [30, 'Time: 1O:3O AM to 12 noon IST'],
    [30, 'Join live on Zoom'],
    [24, 'Free registration: bit.ly/cloudsec26'],
  ]);
  const { details } = parseFlyer(flyer, opts);
  assert.equal(details.format, 'Virtual');
  assert.equal(details.eventType, 'Training');
  assert.equal(details.startDate, '2026-12-05');
  assert.ok(details.uncertainFields.includes('startDate'), 'day/month order is flagged');
  assert.equal(details.startTime, '10:30');
  assert.equal(details.endTime, '12:00');
  assert.equal(details.timezone, 'Asia/Kolkata');
  assert.match(details.description!, /bit\.ly\/cloudsec26/);
});

test('multi-day conference across a month boundary', () => {
  const d = findDates('Dec 30 - Jan 2, 2027', today)!;
  assert.equal(d.startDate, '2027-12-30');
  assert.equal(findDates('30 Dec - 2 Jan', today)!.endDate, '2027-01-02');
  assert.deepEqual(
    [findDates('12-14 December 2026', today)!.startDate, findDates('12-14 December 2026', today)!.endDate],
    ['2026-12-12', '2026-12-14'],
  );
});

test('dates that are not dates', () => {
  assert.equal(findDates('Mar 2026 edition', today), null);
  assert.equal(findDates('21 MARATHON runners', today), null);
  assert.equal(findDates('Call 98480 12345', today), null);
});

test('times', () => {
  assert.deepEqual(findTimes('6 - 9 PM'), { startTime: '18:00', endTime: '21:00', extras: [], ambiguous: false });
  assert.equal(findTimes('10 - 1 PM').startTime, '10:00');
  assert.equal(findTimes('6 Amazing speakers on 12 Dec').startTime, null);
  assert.equal(findTimes('Gates open 5 PM. Show starts 7 PM').startTime, '19:00');
  assert.equal(findTimes('18:00 - 21:00 hrs').endTime, '21:00');
});

test('prize money and expected crowds are not tickets or capacity', () => {
  assert.deepEqual(findTickets('Prize pool ₹50,000'), []);
  assert.equal(findCapacity('500+ attendees expected'), null);
  assert.equal(findCapacity('Only 2 days left'), null);
  assert.equal(findTickets('Early Bird: ₹999 | Regular: Rs. 1499/-')[1].price, 1499);
});

test('titles', () => {
  assert.equal(tidyTitle('AI SUMMIT 2026'), 'AI Summit 2026');
  assert.equal(tidyTitle('Design Sprint'), 'Design Sprint');
});

test('the local agent asks for what is missing and takes short answers', () => {
  const turn = localFlyerTurn(
    lines([
      [100, 'Founders Meetup'],
      [30, 'Friday 20 Nov 2026, 7 PM'],
      [30, 'Venue: T-Hub, Raidurg, Hyderabad'],
    ]),
    opts,
  );
  assert.equal(turn.details.eventType, 'Networking');
  assert.match(turn.reply, /Still needed: end time/);

  const next = localChatTurn(turn.details, 'ends at 10 pm', opts);
  assert.equal(next.details.endTime, '22:00');
  assert.equal(next.details.startTime, '19:00');
  assert.match(next.reply, /I set the end time to 10:00 PM/);

  const renamed = localChatTurn(next.details, 'name: Hyderabad Founders Meetup', opts);
  assert.equal(renamed.details.name, 'Hyderabad Founders Meetup');

  const hello = localChatTurn(renamed.details, 'hello there', opts);
  assert.match(hello.reply, /^Hello! We are working on \*\*Hyderabad Founders Meetup\*\*/);
});

test('conversation: greetings, help and small talk', () => {
  assert.match(localChatTurn(null, 'Hi', opts).reply, /Paste or upload your event flyer/);
  assert.match(localChatTurn(null, 'what can you do?', opts).reply, /Ctrl\+V/);
  assert.match(localChatTurn(null, 'asdf qwerty', opts).reply, /did not catch an event detail/);
  assert.match(localChatTurn(null, 'create it', opts).reply, /nothing to create yet/);
});

test('conversation: an event described in words', () => {
  const t = localChatTurn(null, 'Tech conference in Hyderabad, Dec 2026, around 500 attendees', opts);
  assert.equal(t.details.name, 'Tech Conference');
  assert.equal(t.details.eventType, 'Conference');
  assert.equal(t.details.city, 'Hyderabad');
  assert.equal(t.details.timezone, 'Asia/Kolkata');
  assert.equal(t.details.format, 'In-person');
  assert.equal(t.details.capacity, 500);
  assert.equal(t.details.startDate, null);
  assert.ok(t.details.uncertainFields.includes('name') && t.details.uncertainFields.includes('capacity'));
  assert.match(t.reply, /Which day in December\?/);

  const w = localChatTurn(null, 'Two-day design workshop for 40 people with paid tickets', opts);
  assert.equal(w.details.name, 'Design Workshop');
  assert.equal(w.details.eventType, 'Workshop');
  assert.equal(w.details.capacity, 40);
});

test('conversation: questions are answered from the draft, not treated as edits', () => {
  const draft = localChatTurn(null, 'Founders meetup on 20 Nov 2026 from 7 PM to 10 PM at T-Hub, Hyderabad', opts).details;
  const q = localChatTurn(draft, 'when is it?', opts);
  assert.match(q.reply, /Friday, 20 November 2026/);
  assert.match(q.reply, /7:00 PM to 10:00 PM/);
  assert.deepEqual(q.details, draft);
  assert.match(localChatTurn(draft, 'where is the venue?', opts).reply, /T-Hub, Hyderabad/);
  assert.match(localChatTurn(draft, 'how much are tickets?', opts).reply, /free for now/);
  assert.match(localChatTurn(draft, "what's missing?", opts).reply, /Everything needed is filled in/);
});

test('conversation: corrections in plain words', () => {
  const draft = localChatTurn(null, 'Product launch on 25 Nov 2026, 10 AM to 1 PM at The Grand Convention Centre, Chennai', opts).details;
  // The flyer said Tuesday; 25 Nov 2026 is a Wednesday. A bare weekday moves within the same week.
  const tue = localChatTurn(draft, "no, it's on Tuesday", opts);
  assert.equal(tue.details.startDate, '2026-11-24');
  assert.equal(tue.details.endDate, '2026-11-24');
  assert.match(tue.reply, /start date to Tuesday, 24 November 2026/);

  assert.equal(localChatTurn(draft, 'change the venue to HICC, Hyderabad', opts).details.venue, 'HICC');
  assert.equal(localChatTurn(draft, 'change the venue to HICC, Hyderabad', opts).details.city, 'Hyderabad');
  assert.equal(localChatTurn(draft, 'start time is 11', opts).details.startTime, '11:00');
  assert.ok(localChatTurn(draft, 'start time is 11', opts).details.uncertainFields.includes('startTime'));
  assert.equal(localChatTurn(draft, 'make it online', opts).details.format, 'Virtual');
  assert.equal(localChatTurn(draft, 'set the type to workshop', opts).details.eventType, 'Workshop');
  assert.equal(localChatTurn(draft, 'remove the email', opts).details.contactEmail, null);
  assert.match(localChatTurn(draft, 'that is wrong', opts).reply, /Which part is wrong\?/);
});

test('conversation: "create it" asks the page to create only when the draft is complete', () => {
  const partial = localChatTurn(null, 'Founders meetup on 20 Nov 2026 at 7 PM at T-Hub, Hyderabad', opts);
  const early = localChatTurn(partial.details, 'create it', opts);
  assert.equal(early.action, undefined);
  assert.match(early.reply, /I still need the end time/);

  const done = localChatTurn(partial.details, 'ends at 10 pm and create it', opts);
  assert.equal(done.details.endTime, '22:00');
  assert.equal(done.action, 'create');
  assert.equal(localChatTurn(done.details, 'looks good', opts).action, 'create');
});

// Real tesseract output (both passes) from the Aram Analytics product launch poster: a dark neon
// design with DATE / TIME / VENUE columns, "LAUNC" for LAUNCH, and a weekday that is wrong on the flyer.
test('real poster: Aram Analytics product launch', () => {
  const passes: TextLine[][] = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'product-launch-ocr.json'), 'utf8'));
  for (const fileName of ['Aram Analytics Product Launch Poster.png', 'IMG_2041.png']) {
    const { details, reply } = localFlyerTurn(mergeOcrPasses(passes), { ...opts, fileName });
    assert.equal(details.name, fileName.startsWith('Aram') ? 'Aram Analytics Product Launch' : 'Product Launch');
    assert.equal(details.eventType, 'Corporate Event');
    assert.equal(details.format, 'In-person');
    assert.equal(details.startDate, '2026-11-25');
    assert.equal(details.endDate, '2026-11-25');
    assert.equal(details.startTime, '10:00');
    assert.equal(details.endTime, '13:00');
    assert.equal(details.timezone, 'Asia/Kolkata');
    assert.equal(details.venue, 'The Grand Convention Centre');
    assert.equal(details.city, 'Chennai');
    assert.match(details.description!, /^.*Join us for the exclusive launch of our next-generation product/);
    // 25 November 2026 is a Wednesday; the poster says Tuesday
    assert.match(reply, /is a Wednesday, but the flyer says Tuesday/);
    assert.ok(details.uncertainFields.includes('startDate'));
  }
});

test('an unreadable flyer says so instead of guessing', () => {
  const turn = localFlyerTurn(lines([[20, 'x~']], 30), opts);
  assert.equal(turn.details.name, null);
  assert.match(turn.reply, /could not read enough text/);
});
