import type { AgentTurn } from '../ai/eventDraft';
import { EVENT_TYPES } from '../ai/eventDraft';

/**
 * Rule-based reading of event text (OCR output from a flyer, or an organizer's message),
 * used when no AI provider is connected. Every extractor returns null rather than guessing.
 */

export type Details = AgentTurn['details'];
export type EventType = (typeof EVENT_TYPES)[number];

/** One line of text as OCR saw it; height is the line's pixel height, used to find the title. */
export type TextLine = { text: string; height: number; confidence: number };

export const EMPTY_DETAILS: Details = {
  name: null,
  description: null,
  eventType: null,
  format: null,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  timezone: null,
  venue: null,
  city: null,
  capacity: null,
  contactEmail: null,
  ticketTypes: [],
  uncertainFields: [],
  confidence: 0,
};

/* ───────────── OCR passes ───────────── */

const textKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** How much readable text a pass found, weighting confident lines more. */
const passScore = (lines: TextLine[]) => lines.reduce((s, l) => s + textKey(l.text).length * (l.confidence / 100), 0);

/**
 * Combines OCR passes over the same image: the pass that read the most leads, and lines only
 * another pass found are added after it. Sparse reading turns textures and icons into junk
 * "lines", so only readable ones are kept.
 */
export function mergeOcrPasses(passes: TextLine[][]): TextLine[] {
  const readable = passes.map((p) => p.filter((l) => l.confidence >= 35 && (l.text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2));
  const [primary, ...rest] = [...readable].sort((a, b) => passScore(b) - passScore(a));
  if (!primary) return [];
  const seen = primary.map((l) => textKey(l.text));
  const extra = rest.flat().filter((l) => {
    const k = textKey(l.text);
    if (k.length <= 2 || seen.some((s) => s.includes(k) || k.includes(s))) return false;
    seen.push(k);
    return true;
  });
  return [...primary, ...extra];
}

/* ───────────── text clean-up ───────────── */

/** Fixes OCR slips inside numbers ("1O:3O" → "10:30", "2O26" → "2026") and unifies dashes and spaces. */
export function cleanOcrText(text: string) {
  return text
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/(?<=\d)[oO](?=[\d:.\s]|$)/gm, '0')
    .replace(/(?<=[:.])[oO](?=\d)/g, '0')
    .replace(/(?<=\d)[lI|](?=\d)/g, '1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/* ───────────── dates ───────────── */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b\\.?';
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)';
const JOIN = '\\s*(?:-|to|till|until|&|and)\\s*';
const YEAR = "(?:[\\s,']*(20\\d{2}))?";
const WEEKDAY_RE = /\b(mon|tue|wed|thu|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b/i;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');
const monthIndex = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase());

function realDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m, d));
  return date.getUTCMonth() === m && date.getUTCDate() === d ? `${y}-${pad(m + 1)}-${pad(d)}` : null;
}

/** With no printed year, the event is the next time that day comes round. */
function resolveYear(m: number, d: number, year: number | null, today: string) {
  if (year) return realDate(year, m, d);
  const thisYear = Number(today.slice(0, 4));
  const candidate = realDate(thisYear, m, d);
  return candidate && candidate >= today ? candidate : realDate(thisYear + 1, m, d);
}

export type DateFind = {
  startDate: string;
  endDate: string;
  yearStated: boolean;
  statedWeekday: string | null;
  /** True when a numeric date could be day/month or month/day */
  ambiguous: boolean;
  index: number;
};

/** Finds the event date (or date range) in the text. The first date mentioned wins. */
export function findDates(text: string, today: string): DateFind | null {
  type Hit = { index: number; length: number; start: [number, number]; end: [number, number]; year: number | null; ambiguous: boolean };
  const hits: Hit[] = [];
  const add = (re: RegExp, build: (m: RegExpExecArray) => Omit<Hit, 'index' | 'length'> | null) => {
    for (const m of text.matchAll(new RegExp(re.source, 'gi'))) {
      const hit = build(m as RegExpExecArray);
      if (hit) hits.push({ ...hit, index: m.index!, length: m[0].length });
    }
  };

  // 30 Dec - 2 Jan 2027
  add(new RegExp(`\\b${DAY}\\s*${MONTH}${JOIN}${DAY}\\s*${MONTH}${YEAR}`), (m) => ({
    start: [monthIndex(m[2]), +m[1]], end: [monthIndex(m[4]), +m[3]], year: m[5] ? +m[5] : null, ambiguous: false,
  }));
  // Dec 30 - Jan 2, 2027
  add(new RegExp(`\\b${MONTH}\\s*${DAY}${JOIN}${MONTH}\\s*${DAY}${YEAR}`), (m) => ({
    start: [monthIndex(m[1]), +m[2]], end: [monthIndex(m[3]), +m[4]], year: m[5] ? +m[5] : null, ambiguous: false,
  }));
  // 12 Dec 2026, 12-14 December, 12th & 13th Dec
  add(new RegExp(`\\b${DAY}(?:${JOIN}${DAY})?\\s*(?:of\\s+)?${MONTH}${YEAR}`), (m) => {
    const mo = monthIndex(m[3]);
    return { start: [mo, +m[1]], end: [mo, m[2] ? +m[2] : +m[1]], year: m[4] ? +m[4] : null, ambiguous: false };
  });
  // December 12, 2026 / Dec 12-14
  add(new RegExp(`\\b${MONTH}\\s*${DAY}(?:${JOIN}${DAY})?(?!\\s*(?:am|pm|:))${YEAR}`), (m) => {
    const mo = monthIndex(m[1]);
    return { start: [mo, +m[2]], end: [mo, m[3] ? +m[3] : +m[2]], year: m[4] ? +m[4] : null, ambiguous: false };
  });
  // 2026-12-12
  add(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/, (m) => ({
    start: [+m[2] - 1, +m[3]], end: [+m[2] - 1, +m[3]], year: +m[1], ambiguous: false,
  }));
  // 12/12/2026, 12.12.26 — day first, as on Indian flyers, unless that is impossible
  add(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|\d{2})\b(?![.:]\d)/, (m) => {
    let a = +m[1];
    let b = +m[2];
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (b > 12 && a <= 12) [a, b] = [b, a];
    if (b < 1 || b > 12) return null;
    return { start: [b - 1, a], end: [b - 1, a], year, ambiguous: a <= 12 && a !== b };
  });

  if (!hits.length) return null;
  // Earliest in the text; for the same position, the longest (a range beats a single day).
  hits.sort((x, y) => x.index - y.index || y.length - x.length);
  const hit = hits.find((h) => h.start[0] >= 0 && h.end[0] >= 0);
  if (!hit) return null;

  const startDate = resolveYear(hit.start[0], hit.start[1], hit.year, today);
  if (!startDate) return null;
  let endDate = resolveYear(hit.end[0], hit.end[1], hit.year, today) ?? startDate;
  // "30 Dec - 2 Jan" without a year crosses into the next year
  if (endDate < startDate) endDate = resolveYear(hit.end[0], hit.end[1], Number(startDate.slice(0, 4)) + 1, today) ?? startDate;

  const around = text.slice(Math.max(0, hit.index - 20), hit.index + hit.length + 20);
  // In column layouts "(Tuesday)" can land lines away from its date; use it when it is the only weekday
  const allWeekdays = new Set([...text.matchAll(new RegExp(WEEKDAY_RE.source, 'gi'))].map((m) => m[1].toLowerCase()));
  const wd = WEEKDAY_RE.exec(around) ?? (allWeekdays.size === 1 ? WEEKDAY_RE.exec(text) : null);
  const statedWeekday = wd ? WEEKDAY_NAMES.find((n) => n.toLowerCase().startsWith(wd[1].toLowerCase())) ?? null : null;

  return { startDate, endDate, yearStated: hit.year !== null, statedWeekday, ambiguous: hit.ambiguous, index: hit.index };
}

/* ───────────── times ───────────── */

const MERIDIEM = '(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|noon|hrs?|hours)(?![a-z])';
const CLOCK = `(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:${MERIDIEM})?`;

function toClock(h: number, min: number, meridiem: string | undefined) {
  const mer = meridiem?.toLowerCase().replace(/[.\s]/g, '');
  if (mer === 'noon') return h === 12 ? '12:00' : null;
  if (h > 23 || min > 59) return null;
  if (mer === 'am') h = h === 12 ? 0 : h;
  else if (mer === 'pm') h = h === 12 ? 12 : h + 12;
  if (h > 23) return null;
  return `${pad(h)}:${pad(min)}`;
}

export type TimeFind = {
  startTime: string | null;
  endTime: string | null;
  /** "Reporting 5:30 AM" and the like, kept for the description */
  extras: string[];
  /** A time was printed without AM/PM */
  ambiguous: boolean;
};

const REPORTING = /(report|gate|door|registration|check[\s-]?in|assembl|kit|bib)/i;
const ENDING = /(end|till|until|close|wrap|conclu)/i;

export function findTimes(text: string): TimeFind {
  const out: TimeFind = { startTime: null, endTime: null, extras: [], ambiguous: false };
  const lines = text.split('\n');

  for (const line of lines) {
    // A range: "6 - 9 PM", "10:00 AM to 5:00 PM", "18:00-21:00 hrs"; "12-14 Dec" is a date, not a range of hours
    const range = [...line.matchAll(new RegExp(`${CLOCK}\\s*(?:-|to|till|until)\\s*${CLOCK}`, 'gi'))].find(
      (r) => r[3] || r[6] || r[2] || r[5],
    );
    if (range && !out.startTime) {
      let startMer = range[3];
      const endMer = range[6];
      let start = toClock(+range[1], +(range[2] ?? 0), startMer ?? endMer);
      const end = toClock(+range[4], +(range[5] ?? 0), endMer ?? startMer);
      // "10 - 1 PM" means 10 AM to 1 PM
      if (start && end && !startMer && endMer && start > end) {
        startMer = 'am';
        start = toClock(+range[1], +(range[2] ?? 0), startMer);
      }
      if (start && end) {
        out.startTime = start;
        out.endTime = end;
        if (!startMer && !endMer && +range[1] < 13 && +range[4] < 13) out.ambiguous = true;
        continue;
      }
    }

    // The label for a time is the text between it and the previous time on the line
    let labelStart = 0;
    for (const m of line.matchAll(new RegExp(CLOCK, 'gi'))) {
      const [, h, min, mer] = m;
      // A bare number is not a time; neither is part of a date like 12.12.2026
      if (!mer && min === undefined) continue;
      if (/^[./-]\d/.test(line.slice(m.index! + m[0].length))) continue;
      const clock = toClock(+h, +(min ?? 0), mer);
      if (!clock) continue;
      const before = line.slice(labelStart, m.index!);
      labelStart = m.index! + m[0].length;
      if (REPORTING.test(before)) {
        if (!out.extras.includes(line.trim())) out.extras.push(line.trim());
      } else if (ENDING.test(before)) {
        out.endTime ??= clock;
      } else if (!out.startTime) {
        out.startTime = clock;
        if (!mer && +h < 13) out.ambiguous = true;
      } else if (!out.endTime && clock > out.startTime) {
        out.endTime = clock;
      }
    }
  }
  return out;
}

/* ───────────── contact, links, money, capacity ───────────── */

export function findEmail(text: string) {
  const m = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.exec(text.replace(/\s*@\s*/g, '@'));
  return m ? m[0].replace(/\.$/, '') : null;
}

export function findPhones(text: string) {
  return [...new Set((text.match(/(?:\+\d{1,3}[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\d[\d\s-]{7,}\d/g) || []).map((p) => p.trim()))];
}

export function findLinks(text: string) {
  return [...new Set(text.match(/\b(?:https?:\/\/|www\.)[^\s,]+|\b(?:bit\.ly|forms\.gle|lu\.ma|tinyurl\.com)\/[^\s,]+/gi) || [])];
}

const CURRENCIES: [RegExp, string][] = [
  [/₹|rs\.?|inr|rupees?/i, 'INR'],
  [/\$|usd/i, 'USD'],
  [/€|eur/i, 'EUR'],
  [/£|gbp/i, 'GBP'],
  [/aed|dhs?/i, 'AED'],
];
const PRICE = /(₹|rs\.?|inr|\$|usd|€|eur|£|gbp|aed)\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*\/-)?|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/-|(inr|rs\.?|rupees|usd|aed)\b)/gi;
const NOT_A_TICKET = /\b(prizes?|win|winners?|worth|cash|rewards?|awards?|pool|goodies|sponsors?)\b/i;

export function findTickets(text: string) {
  const tickets: Details['ticketTypes'] = [];
  for (const line of text.split('\n')) {
    if (NOT_A_TICKET.test(line)) continue;
    for (const segment of line.split(/\s*[|•·]\s*|\s{3,}/)) {
      for (const m of segment.matchAll(PRICE)) {
        const symbol = m[1] ?? m[4] ?? 'INR';
        const amount = Number((m[2] ?? m[3]).replace(/,/g, ''));
        if (!Number.isFinite(amount)) continue;
        const currency = CURRENCIES.find(([re]) => re.test(symbol))?.[1] ?? 'INR';
        const label = segment
          .slice(0, m.index)
          .replace(/(entry|fee|fees|ticket|tickets|price|registration|reg\.?|only|at|just|for)\s*[:-]?\s*$/i, '')
          .replace(/[:\-=@]+\s*$/, '')
          .trim()
          .split(/\s+/)
          .slice(-4)
          .join(' ');
        tickets.push({ name: label || 'General', price: amount, currency, capacity: null, description: null });
      }
    }
  }
  // The same tier printed twice (front and footer) counts once
  const seen = new Set<string>();
  const unique = tickets.filter((t) => {
    const key = `${t.name.toLowerCase()}|${t.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length > 1) unique.forEach((t, i) => t.name === 'General' && (t.name = `Ticket ${i + 1}`));
  return unique;
}

export const isFree = (text: string) =>
  /\b(free\s+(entry|registration|event|admission|for all)|entry\s*(is\s*)?free|no\s+(entry\s+)?fee)\b|^\s*free\s*!?\s*$/im.test(text);

/** A stated limit ("limited to 200 seats"), never an estimate like "500+ attendees expected". */
export function findCapacity(text: string) {
  const m =
    /(?:limited to|capacity\s*(?:of|:|-)?)\s*(\d[\d,]*)/i.exec(text) ??
    /(?:only|max(?:imum)?|up\s?to)\s*(\d[\d,]*)\s*(?:seats|participants|attendees|people|guests|spots|registrations|members|pax)\b/i.exec(text) ??
    /(\d[\d,]*)\s*(?:seats|spots)\b/i.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return n > 0 && n < 1_000_000 ? n : null;
}

/* ───────────── place ───────────── */

const INDIAN_CITIES = [
  'Hyderabad', 'Secunderabad', 'Bengaluru', 'Bangalore', 'Chennai', 'Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Delhi', 'New Delhi',
  'Gurugram', 'Gurgaon', 'Noida', 'Greater Noida', 'Ghaziabad', 'Faridabad', 'Kolkata', 'Ahmedabad', 'Surat', 'Vadodara', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Visakhapatnam', 'Vizag', 'Vijayawada', 'Guntur', 'Warangal', 'Tirupati',
  'Nellore', 'Kakinada', 'Rajahmundry', 'Karimnagar', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Trichy', 'Salem', 'Mysuru', 'Mysore',
  'Mangaluru', 'Mangalore', 'Hubli', 'Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum', 'Kozhikode', 'Thrissur', 'Goa', 'Panaji',
  'Chandigarh', 'Mohali', 'Ludhiana', 'Amritsar', 'Dehradun', 'Patna', 'Ranchi', 'Bhubaneswar', 'Cuttack', 'Raipur', 'Guwahati',
  'Nashik', 'Aurangabad', 'Rajkot', 'Udaipur', 'Jodhpur', 'Varanasi', 'Agra', 'Prayagraj', 'Allahabad', 'Srinagar', 'Jammu', 'Shimla',
  'Puducherry', 'Pondicherry',
];
const WORLD_CITIES: Record<string, string> = {
  Dubai: 'Asia/Dubai', 'Abu Dhabi': 'Asia/Dubai', Singapore: 'Asia/Singapore', London: 'Europe/London', Paris: 'Europe/Paris',
  Berlin: 'Europe/Berlin', 'New York': 'America/New_York', 'San Francisco': 'America/Los_Angeles', 'Los Angeles': 'America/Los_Angeles',
  Seattle: 'America/Los_Angeles', Chicago: 'America/Chicago', Austin: 'America/Chicago', Boston: 'America/New_York', Toronto: 'America/Toronto',
  Sydney: 'Australia/Sydney', Melbourne: 'Australia/Melbourne', Tokyo: 'Asia/Tokyo', 'Kuala Lumpur': 'Asia/Kuala_Lumpur',
  Doha: 'Asia/Qatar', Riyadh: 'Asia/Riyadh', Colombo: 'Asia/Colombo', Kathmandu: 'Asia/Kathmandu', Dhaka: 'Asia/Dhaka',
};

export function findCity(text: string) {
  const all = [...INDIAN_CITIES, ...Object.keys(WORLD_CITIES)].sort((a, b) => b.length - a.length);
  let best: { city: string; index: number } | null = null;
  for (const city of all) {
    const m = new RegExp(`\\b${city.replace(/ /g, '\\s+')}\\b`, 'i').exec(text);
    // The last mention is usually the address line, the first may be part of the title
    if (m && (!best || m.index > best.index)) best = { city, index: m.index };
  }
  return best?.city ?? null;
}

export function timezoneFor(city: string | null, text: string): string | null {
  if (city && INDIAN_CITIES.includes(city)) return 'Asia/Kolkata';
  if (city && WORLD_CITIES[city]) return WORLD_CITIES[city];
  if (/₹|\brs\.?\s*\d|\binr\b|\+91|\b[1-9]\d{2}\s?\d{3}\b.*india|\bindia\b|\bIST\b/i.test(text)) return 'Asia/Kolkata';
  return null;
}

const VENUE_LABEL = /^\s*(?:📍\s*)?(?:venue|location|address|where|place|held at|at the)\s*(?:is|:|-)\s*(.+)$/i;
const VENUE_WORDS =
  /\b(hall|hotel|convention|centre|center|auditorium|park|stadium|campus|college|university|institute|school|ground|grounds|club|resort|hub|arena|tower|plaza|mall|complex|expo|banquet|garden|gardens|lawn|lawns|theatre|theater|studio|cafe|café|lounge|office|building|floor|road|rd\.?|street|st\.?|nagar|colony|marg|layout|sector|phase|block|lake|beach|palace|fort|temple|church|mosque|library|museum|gallery|hitex|hicc|novotel|marriott|taj|hyatt|itc|radisson|sheraton|westin|trident|t-hub|wework)\b/i;

/** A venue label alone on its line; OCR often reads the pin icon in front of it as a stray letter */
const VENUE_HEADING = /^\s*(?:\S{1,2}\s+)?(?:venue|location|address|where|place)\s*:?\s*$/i;
/** Date, weekday or time-zone lines from neighbouring columns */
const DATE_OR_ZONE = new RegExp(`^\\s*\\(?\\s*(?:\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}|${MONTH}\\s+\\d|(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\\b|ist\\b|gmt|utc)`, 'i');

/** Lines that are clearly something other than a venue */
const NOT_VENUE = /(@|https?:|www\.|register|call|contact|whatsapp|\bfree\b|prize|₹|rs\.?\s*\d|\d\s*(am|pm)\b)/i;

export function findVenue(lines: string[]): { venue: string; labelled: boolean } | null {
  for (let i = 0; i < lines.length; i++) {
    const m = VENUE_LABEL.exec(lines[i]);
    if (!m) continue;
    let venue = m[1].trim();
    const next = lines[i + 1];
    // An address often runs onto the next line
    if (next && !VENUE_LABEL.test(next) && /,|\d{6}|\b(road|rd|street|nagar|colony|marg|sector|near|opp)\b/i.test(next) && !NOT_VENUE.test(next)) {
      venue = `${venue}, ${next.trim()}`;
    }
    if (venue.length > 2) return { venue, labelled: true };
  }
  // A label on its own line ("📍 VENUE") with the place on the lines below it. In column layouts
  // the date and time columns' values can come in between, so those are skipped.
  for (let i = 0; i < lines.length; i++) {
    if (!VENUE_HEADING.test(lines[i])) continue;
    const parts: string[] = [];
    for (const next of lines.slice(i + 1, i + 7)) {
      if (VENUE_HEADING.test(next) || VENUE_LABEL.test(next)) break;
      if (NOT_VENUE.test(next) || DATE_OR_ZONE.test(next) || !/\p{L}{3}/u.test(next)) continue;
      // The place name, then at most one address or city line
      if (parts.length && !(/,|\d{6}/.test(next) || findCity(next))) break;
      parts.push(next.trim());
      if (parts.length === 2) break;
    }
    if (parts.length) return { venue: parts.join(', '), labelled: true };
  }
  let best: { venue: string; score: number } | null = null;
  lines.forEach((line, i) => {
    if (NOT_VENUE.test(line) || line.length < 4) return;
    const words = line.match(new RegExp(VENUE_WORDS.source, 'gi'))?.length ?? 0;
    const score = words * 2 + (/,/.test(line) ? 1 : 0) + (/\b\d{6}\b/.test(line) ? 2 : 0) + (findCity(line) ? 1 : 0);
    if (score >= 2 && (!best || score > best.score)) {
      let venue = line.trim();
      const next = lines[i + 1];
      if (next && /\d{6}|,\s*\w+$/.test(next) && !NOT_VENUE.test(next) && next.length < 60) venue = `${venue}, ${next.trim()}`;
      best = { venue, score };
    }
  });
  return best ? { venue: (best as { venue: string }).venue, labelled: false } : null;
}

/** Takes the city, pincode and country off the end of a venue so they are not shown twice. */
export function trimVenue(venue: string, city: string | null) {
  let v = venue.replace(/^[\s,:-]+|[\s,:-]+$/g, '');
  const tails = [
    /[,\s-]*\b(india|telangana|karnataka|tamil\s*nadu|maharashtra|andhra\s*pradesh|kerala|gujarat|rajasthan|west\s*bengal|uttar\s*pradesh|delhi\s*ncr|goa|punjab|haryana|odisha)\b\.?$/i,
    /[,\s-]*\b\d{3}\s?\d{3}\b$/,
    ...(city ? [new RegExp(`[,\\s-]*\\b${city.replace(/ /g, '\\s+')}\\b\\.?$`, 'i')] : []),
  ];
  // "…Centre, Chennai, Tamil Nadu, India - 600001": peel off the end until nothing more comes off
  for (let before = ''; before !== v; ) {
    before = v;
    for (const tail of tails) v = v.replace(tail, '');
  }
  return v.replace(/[\s,:-]+$/g, '').trim() || venue.trim();
}

/* ───────────── format and type ───────────── */

export function findFormat(text: string, hasVenue: boolean): Details['format'] {
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  // "Register online" says nothing about where the event happens
  text = text.replace(/\b(register|registration|book|apply|tickets?)\s+(\w+\s+)?online\b|\bonline\s+(registration|booking|tickets?)\b/gi, '');
  const online =/\b(zoom|google meet|ms teams|microsoft teams|webex|youtube live|live\s?stream|online|virtual|webinar)\b/i.test(text);
  if (online && hasVenue && /\b(also|and|or)\s+(online|live|virtual)|\b(in[\s-]person|offline)\b/i.test(text)) return 'Hybrid';
  if (online && !hasVenue) return 'Virtual';
  if (/\b(in[\s-]person|offline)\b/i.test(text) || hasVenue) return 'In-person';
  return null;
}

const TYPE_KEYWORDS: [EventType, RegExp][] = [
  ['Walkathon', /\b(walkathon|marathon|half marathon|run|fun run|\d{1,2}\s?k|cyclothon|walk(?!-in)|race|triathlon|duathlon)\b/gi],
  ['Summit', /\b(summit)\b/gi],
  // Not "convention": that is usually the venue ("Convention Centre"), not the kind of event
  ['Conference', /\b(conference|conclave|symposium|congress|forum)\b/gi],
  ['Exhibition', /\b(exhibition|expo|fair|showcase|trade show|exhibit|mela|carnival)\b/gi],
  ['Workshop', /\b(workshop|bootcamp|boot camp|masterclass|master class|hands[\s-]on|hackathon|design sprint)\b/gi],
  ['Training', /\b(training|course|certification|webinar|seminar|fdp|orientation|lecture)\b/gi],
  ['Networking', /\b(networking|meetup|meet[\s-]up|mixer|happy hour)\b/gi],
  ['Corporate Event', /\b(launch|product launch|annual day|offsite|town\s?hall|awards?|gala|corporate|dealer meet|anniversary|felicitation|launch event)\b/gi],
];

/** Picks the event type from keywords; words in the title count three times. */
export function findEventType(text: string, title: string | null): { type: EventType; sure: boolean } | null {
  let best: { type: EventType; score: number } | null = null;
  for (const [type, re] of TYPE_KEYWORDS) {
    const score = (text.match(re)?.length ?? 0) + (title ? (title.match(re)?.length ?? 0) * 3 : 0);
    if (score > 0 && (!best || score > best.score)) best = { type, score };
  }
  if (!best) return null;
  return { type: best.type, sure: best.score >= 3 };
}

/* ───────────── title ───────────── */

const NOT_TITLE =
  /(@|https?:|www\.|\b(register|registration|call|contact|whatsapp|scan|qr|venue|location|address|date|time|entry|fee|tickets?|organi[sz]ed by|hosted by|in association|powered by|sponsored|supported by|presents?|rsvp|limited|seats?|save the date|you'?re invited|join us|coming soon|book now)\b|₹|\d{1,2}\s*(am|pm)\b|\b20\d{2}\b.*\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i;
const FILE_NOISE = /\b(poster|flyer|flier|final|banner|image|img|copy|draft|design|whatsapp|screenshot|new|edited|v\d+|\d+)\b/gi;
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/** "PRODUCT LAUNCH" → "Product Launch"; leaves mixed case and short acronyms ("AI") alone. */
export function tidyTitle(title: string) {
  const t = title.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})!?]+$/gu, '').trim();
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(' ')
    .map((w, i) => {
      if (w.length <= 2 && !SMALL_WORDS.has(w)) return w.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

const wordsOf = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/** Same word, allowing OCR to drop or misread one letter ("LAUNC" for "LAUNCH"). */
function sameWord(a: string, b: string) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) {
      i++;
      j++;
    } else {
      if (++edits > 1) return false;
      if (s.length === l.length) i++;
      j++;
    }
  }
  return edits + (l.length - j) + (s.length - i) <= 1;
}

/**
 * The title is the largest text on the flyer that is not a date, venue, price or contact line.
 * Lines of nearly the same size next to each other are one title split over lines.
 * The file name helps when it repeats the flyer's words ("Aram Analytics Product Launch Poster.png").
 */
export function findTitle(lines: TextLine[], fileName?: string): { name: string; fromFile: boolean; organizer: string | null } | null {
  let organizer: string | null = null;
  for (const l of lines) {
    const m = /^(.{3,60}?)\s+(presents?|proudly presents|invites you to|brings you)\b/i.exec(l.text) ?? /\b(?:organi[sz]ed|hosted|presented)\s+by\s*:?\s*(.{3,60})$/i.exec(l.text);
    if (m) {
      organizer = m[1].trim();
      break;
    }
  }

  const candidates = lines
    .map((l, i) => ({ ...l, i }))
    .filter((l) => (l.text.match(/\p{L}/gu)?.length ?? 0) >= 3 && !NOT_TITLE.test(l.text) && l.confidence >= 40);

  let ocrTitle: string | null = null;
  if (candidates.length) {
    const tallest = Math.max(...candidates.map((l) => l.height));
    const top = candidates.find((l) => l.height === tallest)!;
    const group = [top];
    for (const dir of [-1, 1]) {
      let i = top.i + dir;
      for (;;) {
        const next = candidates.find((l) => l.i === i);
        if (!next || next.height < tallest * 0.7) break;
        if (dir < 0) group.unshift(next);
        else group.push(next);
        i += dir;
      }
    }
    // Big gradient lettering loses letters ("LAUNC"); restore a word the flyer spells in full elsewhere
    const inTitle = new Set(group.map((l) => l.i));
    const elsewhere = lines.filter((_, i) => !inTitle.has(i)).flatMap((l) => wordsOf(l.text));
    ocrTitle = group
      .map((l) => l.text)
      .join(' ')
      .replace(/[\p{L}]{4,}/gu, (w) => {
        const full = elsewhere.find((f) => f.length === w.length + 1 && sameWord(f, w.toLowerCase()));
        if (!full || elsewhere.includes(w.toLowerCase())) return w;
        return w === w.toUpperCase() ? full.toUpperCase() : full;
      });
  }

  const fromFile = fileName
    ? fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(FILE_NOISE, ' ').replace(/\s+/g, ' ').trim()
    : '';
  const flyerWords = new Set(lines.flatMap((l) => wordsOf(l.text)));
  const fileWords = wordsOf(fromFile);
  const onFlyer = (w: string) => flyerWords.has(w) || [...flyerWords].some((f) => sameWord(f, w));
  const fileMatches = fileWords.length >= 2 && fileWords.filter(onFlyer).length / fileWords.length >= 0.5;

  if (ocrTitle) {
    const titleWords = wordsOf(ocrTitle);
    // The file name is the fuller (and correctly spelled) version of the same title:
    // "PRODUCT LAUNC" on the flyer, "Aram Analytics Product Launch Poster.png" as the file
    if (fileMatches && titleWords.length && titleWords.every((w) => fileWords.some((f) => sameWord(f, w)))) {
      return { name: tidyTitle(fromFile), fromFile: false, organizer };
    }
    return { name: tidyTitle(ocrTitle), fromFile: false, organizer };
  }
  if (fileWords.length >= 2) return { name: tidyTitle(fromFile), fromFile: true, organizer };
  return null;
}

/* ───────────── blurb ───────────── */

const NOT_BLURB = /(@|https?:|www\.|₹|\d\s*(am|pm)\b)/i;

function sentenceLike(text: string) {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const lower = text.match(/\p{Ll}/gu)?.length ?? 0;
  return letters >= 8 && lower / letters > 0.7 && !NOT_BLURB.test(text);
}

/** The flyer's own description: the longest run of sentence-like lines ("Join us for the exclusive launch of our …"). */
export function findAbout(lines: TextLine[]) {
  let best = '';
  for (let i = 0; i < lines.length; i++) {
    if (!sentenceLike(lines[i].text) || lines[i].text.split(/\s+/).length < 5) continue;
    const run = [lines[i].text];
    while (i + 1 < lines.length && sentenceLike(lines[i + 1].text)) run.push(lines[++i].text);
    const joined = run.join(' ').replace(/\s+/g, ' ').trim();
    if (joined.length > best.length) best = joined;
  }
  if (best.length < 25) return null;
  const clipped = best.length > 400 ? `${best.slice(0, 400).replace(/\s+\S*$/, '')}…` : best;
  return /[.!?…]$/.test(clipped) ? clipped : `${clipped}.`;
}

/* ───────────── putting it together ───────────── */

export type FlyerParse = {
  details: Details;
  transcription: string;
  statedWeekday: string | null;
  yearStated: boolean;
};

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const prettyTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export { prettyDate, prettyTime };

/** Reads every field it can from a flyer's OCR lines. */
export function parseFlyer(rawLines: TextLine[], opts: { today: string; timeZone: string; fileName?: string }): FlyerParse {
  const lines = rawLines.map((l) => ({ ...l, text: cleanOcrText(l.text) })).filter((l) => l.text.length > 0);
  const text = lines.map((l) => l.text).join('\n');
  const plain = lines.map((l) => l.text);
  const details: Details = { ...EMPTY_DETAILS, ticketTypes: [], uncertainFields: [] };
  const unsure = new Set<string>();

  const title = findTitle(lines, opts.fileName);
  if (title) {
    details.name = title.name;
    if (title.fromFile) unsure.add('name');
  }

  const dates = findDates(text, opts.today);
  if (dates) {
    details.startDate = dates.startDate;
    details.endDate = dates.endDate;
    if (dates.ambiguous) unsure.add('startDate');
  }

  const times = findTimes(text);
  details.startTime = times.startTime;
  details.endTime = times.endTime;
  if (times.ambiguous) unsure.add('startTime');

  const city = findCity(text);
  details.city = city;
  const venue = findVenue(plain);
  if (venue) {
    details.venue = trimVenue(venue.venue, city);
    if (!venue.labelled) unsure.add('venue');
  }

  details.format = findFormat(text, !!venue);
  if (details.format && !venue && details.format !== 'Virtual') unsure.add('format');

  const type = findEventType(text, details.name);
  details.eventType = type?.type ?? 'Other';
  if (!type?.sure) unsure.add('eventType');

  details.timezone = timezoneFor(city, text);
  if (!details.timezone) {
    details.timezone = opts.timeZone;
    unsure.add('timezone');
  }

  details.contactEmail = findEmail(text);
  details.capacity = findCapacity(text);
  details.ticketTypes = findTickets(text);

  // Description: a plain summary, then what the flyer says that has no field of its own
  const parts: string[] = [];
  if (details.name) {
    const when = details.startDate ? ` on ${prettyDate(details.startDate)}` : '';
    const where = details.venue ? ` at ${[details.venue, city].filter(Boolean).join(', ')}` : '';
    parts.push(`${details.name}${when}${where}.`);
  }
  const about = findAbout(lines);
  if (about) parts.push(about);
  if (title?.organizer) parts.push(`Hosted by ${title.organizer}.`);
  for (const extra of times.extras) parts.push(`${extra.replace(/[.\s]+$/, '')}.`);
  if (isFree(text)) parts.push('Entry is free.');
  const links = findLinks(text);
  if (links.length) parts.push(`Register: ${links.join(', ')}.`);
  const phones = findPhones(text);
  if (phones.length) parts.push(`Contact: ${phones.join(', ')}.`);
  details.description = parts.join(' ') || null;

  const mean = lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length / 100 : 0;
  const required = [details.name, details.eventType, details.format, details.startDate, details.startTime, details.endTime, details.format === 'Virtual' || details.venue];
  const found = required.filter(Boolean).length / required.length;
  details.confidence = Math.max(0, Math.min(1, 0.5 * mean + 0.5 * found - 0.04 * unsure.size));
  details.uncertainFields = [...unsure];

  return { details, transcription: text, statedWeekday: dates?.statedWeekday ?? null, yearStated: dates?.yearStated ?? false };
}
