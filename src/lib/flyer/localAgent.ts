import { EVENT_TYPES } from '../ai/eventDraft';
import { validateFlyerDraft } from '../ai/validateFlyerDraft';
import {
  EMPTY_DETAILS,
  cleanOcrText,
  findCapacity,
  findCity,
  findDates,
  findEmail,
  findEventType,
  findTickets,
  findTimes,
  findVenue,
  parseFlyer,
  prettyDate,
  prettyTime,
  timezoneFor,
  trimVenue,
  type Details,
  type TextLine,
} from './parseEventText';

/**
 * The event agent without an AI provider: reads the flyer with OCR and rules, and holds a simple
 * conversation about the draft (questions, corrections, "create it"). Returns the same shape as
 * /api/agent, plus an optional action, so the page treats both the same way.
 */

type Options = { today: string; timeZone: string };

const LABELS: Partial<Record<keyof Details, string>> = {
  name: 'name',
  eventType: 'event type',
  format: 'format',
  startDate: 'start date',
  endDate: 'end date',
  startTime: 'start time',
  endTime: 'end time',
  timezone: 'time zone',
  venue: 'venue',
  city: 'city',
  capacity: 'capacity',
  contactEmail: 'contact email',
  ticketTypes: 'ticket prices',
  description: 'description',
};

function missing(d: Details) {
  const out: string[] = [];
  if (!d.name) out.push('event name');
  if (!d.eventType) out.push('event type');
  if (!d.format) out.push('format');
  if (!d.startDate) out.push('start date');
  if (!d.startTime) out.push('start time');
  if (!d.endTime) out.push('end time');
  if (d.format !== 'Virtual' && !d.venue) out.push('venue');
  return out;
}

const EXAMPLES: Record<string, string> = {
  'event name': '"name: Aram Product Launch"',
  'event type': '"type: conference"',
  format: '"in person" or "online"',
  'start date': '"date: 12 Dec 2026"',
  'start time': '"starts at 10 AM"',
  'end time': '"ends at 6 PM"',
  venue: '"venue: HICC, Hyderabad"',
};

function askFor(still: string[]) {
  if (!still.length) return 'Everything needed is filled in. Review the draft and say "create it" (or click **Create event**) when you are ready.';
  const examples = still.slice(0, 2).map((m) => EXAMPLES[m]).filter(Boolean);
  return `Still needed: ${still.join(', ')}. Tell me in a message${examples.length ? `, for example ${examples.join(' or ')}` : ''}, or click a field to fill it in.`;
}

/** "a", "a and b", "a, b and c" */
const listing = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

function summary(d: Details) {
  const bits: string[] = [];
  if (d.name) bits.push(`**${d.name}**`);
  if (d.startDate) {
    const range = d.endDate && d.endDate !== d.startDate ? ` to ${prettyDate(d.endDate)}` : '';
    bits.push(`on ${prettyDate(d.startDate)}${range}`);
  }
  if (d.startTime) bits.push(`from ${prettyTime(d.startTime)}${d.endTime ? ` to ${prettyTime(d.endTime)}` : ''}`);
  if (d.venue) bits.push(`at ${[d.venue, d.city].filter(Boolean).join(', ')}`);
  return bits.join(' ');
}

/** Reads a flyer from its OCR lines into a draft, checks it, and writes the reply. */
export function localFlyerTurn(lines: TextLine[], opts: Options & { fileName?: string }) {
  const parsed = parseFlyer(lines, opts);
  const readable = parsed.transcription.replace(/[^\p{L}\p{N}]/gu, '').length;

  if (readable < 15) {
    return {
      reply:
        'I could not read enough text on this flyer to fill in the draft. Try a sharper or larger image, or tell me the details in a message (name, date, time and venue).',
      details: { ...EMPTY_DETAILS, ticketTypes: [], uncertainFields: [] },
      flyerText: parsed.transcription,
    };
  }

  const { details, issues } = validateFlyerDraft(parsed.details, { ...parsed, today: opts.today });
  const found = summary(details);
  const unsure = details.uncertainFields.map((f) => LABELS[f as keyof Details] ?? f);

  const parts = [
    found ? `I read your flyer on this device: ${found}.` : 'I read your flyer on this device.',
    unsure.length ? `I am not sure about the ${listing(unsure)}, so ${unsure.length === 1 ? 'it is' : 'they are'} highlighted.` : '',
    askFor(missing(details)),
  ].filter(Boolean);
  let reply = parts.join(' ');
  if (issues.length) reply += `\n\nPlease check these against your flyer:\n${issues.map((i) => `- ${i.message}`).join('\n')}`;

  return { reply, details, flyerText: parsed.transcription };
}

const TYPE_WORDS = /\b(conference|corporate|workshop|exhibition|summit|networking|training|walkathon|meetup|expo|seminar|webinar|marathon|run|launch|bootcamp|hackathon|fest|festival|party|gala|concert|fair)\b/i;

export type LocalTurn = { reply: string; details: Details; action?: 'create' };

/* ───────────── reading values out of a message ───────────── */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_WORD = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?\b/i;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/**
 * "today", "tomorrow", "in 3 days", "next Saturday", or a bare weekday. A bare weekday that
 * corrects an existing date ("no, it's on Tuesday") moves to that weekday in the same week.
 */
export function findRelativeDate(text: string, today: string, anchor: string | null) {
  const t = text.toLowerCase();
  if (/\bday after tomorrow\b/.test(t)) return addDays(today, 2);
  if (/\btomorrow\b/.test(t)) return addDays(today, 1);
  if (/\b(today|tonight)\b/.test(t)) return today;
  const inDays = /\bin\s+(\d{1,3})\s+days?\b/.exec(t);
  if (inDays) return addDays(today, +inDays[1]);
  const wd = WEEKDAY_WORD.exec(t);
  if (!wd) return null;
  const target = WEEKDAYS.findIndex((w) => w.startsWith(wd[1].slice(0, 3)));
  if (target < 0) return null;
  const qualified = new RegExp(`\\b(next|this|coming|upcoming)\\s+${wd[0]}`, 'i').test(t);
  if (anchor && !qualified) {
    for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
      const day = addDays(anchor, offset);
      if (weekdayOf(day) === target) return day;
    }
  }
  const ahead = (target - weekdayOf(today) + 7) % 7 || 7;
  return addDays(today, /\bnext\s+week\b/.test(t) ? ahead + 7 : ahead);
}

/**
 * "… at The Grand Convention Centre, Chennai on 25 Nov": the capitalised place after "at" or
 * "venue", up to the next date, time or clause. "at 7 PM" is not a place.
 */
function venueFromSentence(text: string) {
  const m = /\b(?:at|@|venue(?:\s+is)?|located\s+at|held\s+at)\s+((?:the\s+)?[A-Z][\w&'.-]*(?:\s+[A-Z0-9&][\w&'.-]*)*(?:,\s*[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*)*)*)/.exec(text);
  if (!m) return null;
  const place = m[1].replace(/,?\s+(?:On|From|Between|Starting)$/, '').trim();
  // A city on its own is the city, not a venue
  if (findCity(place)?.toLowerCase() === place.toLowerCase()) return null;
  return { venue: place, labelled: true };
}

/** "10" or "7:30" with no AM/PM: daytime hours are AM, 1–6 are PM. Marked as a guess. */
function bareHour(value: string) {
  const m = /^\s*(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*$/.exec(value);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  if (h >= 1 && h <= 6) h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function formatFrom(text: string): Details['format'] {
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  if (/\b(online|virtual|zoom|google meet|teams|webinar|remote)\b/i.test(text)) return 'Virtual';
  if (/\b(in[\s-]?person|offline|physical|on[\s-]?site)\b/i.test(text)) return 'In-person';
  return null;
}

function typeFrom(text: string): Details['eventType'] {
  const exact = EVENT_TYPES.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(text));
  if (exact) return exact;
  return findEventType(text, text)?.type ?? null;
}

function zoneFrom(text: string) {
  const zone = /\b([A-Z][a-z]+\/[A-Za-z_]+)\b/.exec(text)?.[1];
  if (zone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone });
      return zone;
    } catch {
      return null;
    }
  }
  return /\bIST\b|\bindia/i.test(text) ? 'Asia/Kolkata' : null;
}

function capacityFrom(text: string) {
  const stated = findCapacity(text);
  if (stated) return { value: stated, guess: false };
  const m = /(\d[\d,]*)\+?\s*(?:people|attendees|guests|participants|pax|members|delegates)\b/i.exec(text);
  return m ? { value: Number(m[1].replace(/,/g, '')), guess: true } : null;
}

const titleCase = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w, i) => (i > 0 && /^(a|an|and|as|at|by|for|in|of|on|or|the|to|with)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

/** "Tech conference in Hyderabad, Dec 2026" → "Tech Conference" (only when it names a kind of event). */
export function guessName(text: string) {
  const m =
    /^\s*(?:(?:i(?:'m| am)|we(?:'re| are))\s+(?:planning|organi[sz]ing|hosting|running|doing|having)\s+)?(?:an?\s+|the\s+|our\s+|my\s+)?(.+?)(?=\s+(?:in|at|on|for|from|with|next|this|around|by|starting|that|which|near)\b|[,.;:!?]|\s+\d|$)/i.exec(
      text,
    );
  if (!m) return null;
  const phrase = m[1].replace(/^(?:\d+|one|two|three|four|five)[\s-]day\s+/i, '').trim();
  const words = phrase.split(/\s+/);
  if (!TYPE_WORDS.test(phrase) || words.length > 7) return null;
  return titleCase(phrase);
}

/* ───────────── "change the venue to …" ───────────── */

type Target = keyof Details | 'date' | 'time';

const FIELD_ALIASES: [string, Target][] = [
  ['start\\s*date', 'startDate'],
  ['end\\s*date|last\\s*day', 'endDate'],
  ['start(?:ing)?\\s*time', 'startTime'],
  ['end(?:ing)?\\s*time|finish(?:ing)?\\s*time', 'endTime'],
  ['time\\s*zone|timezone', 'timezone'],
  ['date|day', 'date'],
  ['time|timings?', 'time'],
  ['(?:event\\s*)?(?:name|title)', 'name'],
  ['(?:event\\s*)?type|category|kind', 'eventType'],
  ['format|mode', 'format'],
  ['venue|location|place|address', 'venue'],
  ['city', 'city'],
  ['capacity|seats|attendee\\s*limit|limit', 'capacity'],
  ['(?:contact\\s*)?e-?mail|contact', 'contactEmail'],
  ['description|about|summary', 'description'],
];

const SETTER = new RegExp(
  `^\\s*(?:please\\s+)?(?:can\\s+you\\s+|could\\s+you\\s+)?(?:change|set|update|make|put|correct|fix|edit|rename)?\\s*(?:the\\s+|its\\s+|my\\s+)?(?:event'?s?\\s+)?(${FIELD_ALIASES.map(([a]) => a).join('|')})\\s*(?:to|as|=|:|-|is|should\\s+be|will\\s+be|=>)\\s+(.+?)\\s*[.!?]*\\s*$`,
  'i',
);

function targetOf(word: string): Target | null {
  return FIELD_ALIASES.find(([alias]) => new RegExp(`^(?:${alias})$`, 'i').test(word.trim()))?.[1] ?? null;
}

/** The values a "field to value" message sets, and which of them are guesses. */
function valueFor(target: Target, raw: string, d: Details, opts: Options): { set: Partial<Details>; guessed: (keyof Details)[] } | null {
  const value = raw.replace(/^["']|["']$/g, '').trim();
  if (!value) return null;
  switch (target) {
    case 'name':
    case 'description':
      return { set: { [target]: value }, guessed: [] };
    case 'venue': {
      const city = findCity(value);
      return { set: { venue: trimVenue(value, city), ...(city ? { city } : {}) }, guessed: [] };
    }
    case 'city':
      return { set: { city: findCity(value) ?? titleCase(value) }, guessed: [] };
    case 'date':
    case 'startDate':
    case 'endDate': {
      const found = findDates(value, opts.today);
      const day = found?.startDate ?? findRelativeDate(value, opts.today, target === 'endDate' ? d.endDate : d.startDate);
      if (!day) return null;
      if (target === 'endDate') return { set: { endDate: found?.endDate ?? day }, guessed: [] };
      const end = found && found.endDate !== found.startDate ? found.endDate : target === 'date' ? day : d.endDate && d.endDate >= day && d.endDate !== d.startDate ? d.endDate : day;
      return { set: { startDate: day, endDate: end }, guessed: [] };
    }
    case 'time':
    case 'startTime':
    case 'endTime': {
      const times = findTimes(value);
      if (times.startTime && times.endTime && target === 'time') return { set: { startTime: times.startTime, endTime: times.endTime }, guessed: times.ambiguous ? ['startTime'] : [] };
      const single = times.startTime ?? times.endTime;
      const hour = single ?? bareHour(value);
      if (!hour) return null;
      const key = target === 'endTime' ? 'endTime' : 'startTime';
      return { set: { [key]: hour }, guessed: single && !times.ambiguous ? [] : [key] };
    }
    case 'eventType': {
      const type = typeFrom(value) ?? (/\bother\b/i.test(value) ? 'Other' : null);
      return type ? { set: { eventType: type }, guessed: [] } : null;
    }
    case 'format': {
      const format = formatFrom(value);
      return format ? { set: { format }, guessed: [] } : null;
    }
    case 'timezone': {
      const zone = zoneFrom(value);
      return zone ? { set: { timezone: zone }, guessed: [] } : null;
    }
    case 'capacity': {
      const n = Number(/(\d[\d,]*)/.exec(value)?.[1].replace(/,/g, ''));
      return n > 0 ? { set: { capacity: n }, guessed: [] } : null;
    }
    case 'contactEmail': {
      const email = findEmail(value);
      return email ? { set: { contactEmail: email }, guessed: [] } : null;
    }
    default:
      return null;
  }
}

/* ───────────── what the organizer wants ───────────── */

const GREETING = /^\s*(hi+|hello+|hey+|hai|hola|namaste|vanakkam|good\s+(morning|afternoon|evening)|yo)\b/i;
const THANKS = /\b(thanks|thank\s*you|thx|ty|great\s+job|awesome|nice\s+work|cool)\b/i;
const HELP = /\b(help|what can you do|how (does|do) (this|you|it) work|how do i|guide me|what should i (do|say)|instructions)\b/i;
const CREATE = /\b(create|publish|submit|confirm|proceed|finali[sz]e|go ahead|book it|save (it|the event))\b/i;
const AFFIRM = /^\s*(yes|yeah|yep|yup|ok|okay|sure|looks\s+(good|great|fine|perfect)|perfect|done|correct|all\s+good|that'?s\s+(it|right|correct|all)|go)\b[\s.!]*$/i;
const NEGATIVE = /^\s*(no|nope|nah)\b|\b(wrong|incorrect|not\s+(right|correct)|mistake|misread|typo)\b/i;
const STATUS = /\b(missing|left|needed|remaining|status|summary|show( me)?|review|recap|what do you have|so far|draft|details)\b/i;
const QUESTION = /\?\s*$|^\s*(when|where|what|which|how|who|is|are|does|do|can|will|whats|what's)\b/i;
const RESET = /\b(start over|restart|reset|new event|clear (all|everything)|from scratch)\b/i;
const CLEAR = /\b(?:remove|clear|delete|drop|no)\s+(?:the\s+)?(e-?mail|contact(?:\s+e-?mail)?|capacity|limit|tickets?|ticket\s+prices|prices|end\s+date|end\s+time|description|city)\b/i;

const CLEAR_FIELDS: [RegExp, keyof Details][] = [
  [/mail|contact/i, 'contactEmail'],
  [/capacity|limit/i, 'capacity'],
  [/ticket|price/i, 'ticketTypes'],
  [/end\s+date/i, 'endDate'],
  [/end\s+time/i, 'endTime'],
  [/description/i, 'description'],
  [/city/i, 'city'],
];

function describe(field: keyof Details, d: Details): string {
  const v = d[field];
  if (field === 'startDate' || field === 'endDate') return v ? prettyDate(v as string) : 'not set';
  if (field === 'startTime' || field === 'endTime') return v ? prettyTime(v as string) : 'not set';
  if (field === 'ticketTypes') return d.ticketTypes.length ? d.ticketTypes.map((t) => `${t.name} ${t.currency} ${t.price}`).join(', ') : 'free / none';
  if (v === null || v === undefined || v === '') return 'not set';
  return String(v);
}

/** Answers "when is it?", "where?", "how much are tickets?" from the draft. */
function answer(question: string, d: Details): string | null {
  const q = question.toLowerCase();
  const out: string[] = [];
  const has = (re: RegExp) => re.test(q);
  if (has(/\b(when|date|day|which day)\b/)) {
    out.push(
      d.startDate
        ? `It is on ${prettyDate(d.startDate)}${d.endDate && d.endDate !== d.startDate ? ` to ${prettyDate(d.endDate)}` : ''}.`
        : 'The date is not set yet.',
    );
  }
  if (has(/\b(when|time|start|starts|begin|end|ends|finish|till|until|how long)\b/)) {
    out.push(
      d.startTime
        ? `It runs from ${prettyTime(d.startTime)}${d.endTime ? ` to ${prettyTime(d.endTime)}` : ', and the end time is not set yet'}${d.timezone ? ` (${d.timezone})` : ''}.`
        : 'The start time is not set yet.',
    );
  }
  if (has(/\b(where|venue|location|place|address|city)\b/)) {
    out.push(d.venue || d.city ? `It is at ${[d.venue, d.city].filter(Boolean).join(', ')}.` : 'The venue is not set yet.');
  }
  if (has(/\b(price|prices|cost|fee|fees|ticket|tickets|how much|free|paid)\b/)) {
    out.push(d.ticketTypes.length ? `Tickets: ${describe('ticketTypes', d)}.` : 'No ticket prices are set, so it is free for now. You can add tiers on the Tickets page after creating the event.');
  }
  if (has(/\b(capacity|how many|seats|limit|attendees)\b/)) out.push(d.capacity ? `Capacity is ${d.capacity}.` : 'No capacity limit is set.');
  if (has(/\b(email|e-mail|contact)\b/)) out.push(d.contactEmail ? `The contact email is ${d.contactEmail}.` : 'No contact email is set.');
  if (has(/\b(name|title|called)\b/)) out.push(d.name ? `The event is called **${d.name}**.` : 'The name is not set yet.');
  if (has(/\b(type|kind|category)\b/)) out.push(d.eventType ? `It is set as a ${d.eventType}.` : 'The event type is not set yet.');
  if (has(/\b(format|online|virtual|in[\s-]?person|hybrid|offline)\b/)) out.push(d.format ? `The format is ${d.format}.` : 'The format is not set yet.');
  if (has(/\b(time\s*zone|timezone)\b/)) out.push(d.timezone ? `The time zone is ${d.timezone}.` : 'The time zone is not set yet.');
  if (has(/\b(description|about)\b/)) out.push(d.description ? `Description: ${d.description}` : 'There is no description yet.');
  return out.length ? [...new Set(out)].join(' ') : null;
}

const hasAnything = (d: Details) => !!(d.name || d.startDate || d.venue || d.eventType || d.startTime);

/**
 * One turn of conversation without an AI provider: understands greetings, questions about the
 * draft, corrections ("change the venue to …", "no, it's on Tuesday"), plain descriptions of an
 * event, and "create it". Never invents a value: anything guessed is highlighted.
 */
export function localChatTurn(current: Partial<Details> | null, message: string, opts: Options): LocalTurn {
  const d: Details = {
    ...EMPTY_DETAILS,
    ...current,
    ticketTypes: [...(current?.ticketTypes ?? [])],
    uncertainFields: [...(current?.uncertainFields ?? [])],
    confidence: current?.confidence ?? 0,
  };
  const before = { ...d };
  const text = cleanOcrText(message);
  const changed = new Set<keyof Details>();
  const guessed = new Set<keyof Details>();
  const set = <K extends keyof Details>(key: K, value: Details[K], guess = false) => {
    if (value === null || value === undefined || value === d[key]) return;
    d[key] = value;
    changed.add(key);
    if (guess) guessed.add(key);
  };
  const isQuestion = QUESTION.test(text) && !SETTER.test(text);

  // 1. "change the venue to HICC", "date: 12 Dec", "start time is 10"
  const setter = SETTER.exec(text);
  const target = setter ? targetOf(setter[1]) : null;
  const update = target && setter ? valueFor(target, setter[2], d, opts) : null;
  if (update) {
    for (const [k, v] of Object.entries(update.set)) set(k as keyof Details, v as never, update.guessed.includes(k as keyof Details));
  }

  // 2. "remove the email", "no tickets"
  const clear = CLEAR.exec(text);
  if (clear && !update) {
    const field = CLEAR_FIELDS.find(([re]) => re.test(clear[1]))?.[1];
    if (field) {
      if (field === 'ticketTypes') d.ticketTypes = [];
      else (d as Record<string, unknown>)[field] = field === 'endDate' ? d.startDate : null;
      changed.add(field);
    }
  }

  // 3. Free-form details in a statement ("Tech conference in Hyderabad on 12 Dec, 10 AM to 5 PM")
  if (!update && !clear && !isQuestion) {
    const dates = findDates(text, opts.today);
    if (dates) {
      const lead = text.slice(0, dates.index);
      if (dates.startDate === dates.endDate && /\b(end|ends|ending|till|until|last day)\b/i.test(lead)) set('endDate', dates.endDate);
      else {
        set('startDate', dates.startDate);
        set('endDate', dates.endDate);
      }
    } else {
      const relative = findRelativeDate(text, opts.today, d.startDate);
      if (relative) set('startDate', relative);
    }

    const times = findTimes(text);
    set('startTime', times.startTime, times.ambiguous);
    set('endTime', times.endTime);
    const startsAt = !times.startTime && /\b(?:start(?:s|ing)?|begins?|from)\s+(?:at\s+)?(\d{1,2}(?:[:.]\d{2})?)\b(?!\s*(?:am|pm|[/.-]\d))/i.exec(text);
    if (startsAt) set('startTime', bareHour(startsAt[1]), true);
    const endsAt = !times.endTime && /\b(?:end(?:s|ing)?|finish(?:es)?|till|until)\s+(?:at\s+|by\s+)?(\d{1,2}(?:[:.]\d{2})?)\b(?!\s*(?:am|pm|[/.-]\d))/i.exec(text);
    if (endsAt) set('endTime', bareHour(endsAt[1]), true);

    const city = findCity(text);
    const venue = venueFromSentence(text) ?? findVenue([text]);
    if (venue && (venue.labelled || /\b(at|venue|location|place)\b/i.test(text))) set('venue', trimVenue(venue.venue, city));
    if (city) set('city', city);

    set('format', formatFrom(text));
    if (TYPE_WORDS.test(text) || EVENT_TYPES.some((t) => new RegExp(`\\b${t}\\b`, 'i').test(text))) set('eventType', typeFrom(text));
    if (!d.name) set('name', guessName(text), true);

    set('timezone', zoneFrom(text));
    set('contactEmail', findEmail(text));
    const capacity = capacityFrom(text);
    if (capacity) set('capacity', capacity.value, capacity.guess);
    const tickets = findTickets(text);
    if (tickets.length) {
      d.ticketTypes = tickets;
      changed.add('ticketTypes');
    } else if (/\bfree\b/i.test(text) && /\b(event|entry|ticket|registration|admission)\b/i.test(text) && d.ticketTypes.length) {
      d.ticketTypes = [];
      changed.add('ticketTypes');
    }
  }

  // Keep the draft consistent after a change
  if (changed.has('city') && !changed.has('timezone') && !d.timezone) set('timezone', timezoneFor(d.city, d.city ?? ''));
  if (!d.format && (d.venue || d.city) && (changed.has('venue') || changed.has('city'))) set('format', 'In-person', true);
  if (changed.has('startDate') && !changed.has('endDate') && (!before.endDate || before.endDate === before.startDate)) d.endDate = d.startDate;
  if (d.startDate && (!d.endDate || d.endDate < d.startDate)) d.endDate = d.startDate;

  // What the organizer supplied is settled; what was guessed needs a look
  const unsure = new Set(d.uncertainFields.filter((f) => !changed.has(f as keyof Details)));
  guessed.forEach((f) => unsure.add(f));
  d.uncertainFields = [...unsure];

  const still = missing(d);
  const wantsCreate = CREATE.test(text) || (AFFIRM.test(text) && hasAnything(d));

  // Replies
  if (changed.size) {
    const updates = [...changed]
      .filter((k) => k !== 'endDate' || !changed.has('startDate') || d.endDate !== d.startDate)
      .map((k) => `${LABELS[k] ?? k} to ${k === 'name' ? `**${describe(k, d)}**` : describe(k, d)}`);
    const guesses = [...guessed].map((k) => LABELS[k] ?? k);
    let reply = `Done. I set the ${listing(updates)}.`;
    if (guesses.length) reply += ` I guessed the ${listing(guesses)}, so check ${guesses.length === 1 ? 'it' : 'them'}.`;
    if (wantsCreate && !still.length) return { reply: `${reply} Creating the event now.`, details: d, action: 'create' };
    return { reply: `${reply} ${monthHint(text, d)}${askFor(still)}`, details: d };
  }

  if (RESET.test(text)) {
    return { reply: 'To start a new event, click **New chat** at the top right. Your current draft stays here until you do.', details: d };
  }

  if (wantsCreate) {
    if (!hasAnything(d)) return { reply: 'There is nothing to create yet. Paste or upload a flyer, or describe the event, and I will build the draft.', details: d };
    if (still.length) return { reply: `Almost there. Before I can create it, ${askFor(still).replace(/^Still needed:/, 'I still need the')}`, details: d };
    return { reply: `Creating **${d.name}** as a draft now.`, details: d, action: 'create' };
  }

  if (isQuestion) {
    if (STATUS.test(text) && !answer(text.replace(STATUS, ''), d)) {
      return { reply: hasAnything(d) ? `Here is the draft so far: ${summary(d)}. ${askFor(still)}` : 'Nothing yet. Paste or upload a flyer, or describe your event, and I will fill in the draft.', details: d };
    }
    const reply = answer(text, d);
    if (reply) return { reply: `${reply}${still.length ? ` ${askFor(still)}` : ''}`, details: d };
  }

  if (HELP.test(text)) {
    return {
      reply: [
        'I set up your event from a flyer or a description. You can:',
        '- Paste a flyer with Ctrl+V, drag it in, or click **+** to upload it',
        '- Describe it: "Tech conference at HICC, Hyderabad on 12 Dec, 10 AM to 5 PM"',
        '- Fix anything: "change the venue to T-Hub", "ends at 6 PM", "no, it is on Tuesday"',
        '- Ask: "when is it?", "what is missing?"',
        '- Say "create it" when the draft looks right',
      ].join('\n'),
      details: d,
    };
  }

  if (GREETING.test(text)) {
    const hello = 'Hello!';
    return {
      reply: hasAnything(d)
        ? `${hello} We are working on ${summary(d)}. ${askFor(still)}`
        : `${hello} Paste or upload your event flyer, or describe the event (name, date, time and venue) and I will build the draft for you.`,
      details: d,
    };
  }

  if (THANKS.test(text)) {
    return { reply: still.length ? `You're welcome! ${askFor(still)}` : 'You\'re welcome! Say "create it" whenever you are ready.', details: d };
  }

  if (NEGATIVE.test(text)) {
    return {
      reply: 'Sorry about that. Which part is wrong? Tell me the right value, for example "change the date to 24 Nov", "the venue is T-Hub, Hyderabad" or "starts at 11 AM", or click the field in the draft to edit it.',
      details: d,
    };
  }

  if (STATUS.test(text) && hasAnything(d)) {
    return { reply: `Here is the draft so far: ${summary(d)}. ${askFor(still)}`, details: d };
  }

  return {
    reply: hasAnything(d)
      ? `I did not catch an event detail in that. ${askFor(still)} You can also ask "what is missing?" or say "help".`
      : 'I did not catch an event detail in that. Paste or upload your flyer, or describe the event, for example "Product launch at The Grand Convention Centre, Chennai on 25 Nov, 10 AM to 1 PM".',
    details: d,
  };
}

/** "Dec 2026" names a month but not a day; ask for the day rather than guess it. */
function monthHint(text: string, d: Details) {
  if (d.startDate) return '';
  const month = MONTH_NAMES.find((m) => new RegExp(`\\b${m.slice(0, 3)}[a-z]*\\b`, 'i').test(text));
  return month ? `Which day in ${month}? ` : '';
}
