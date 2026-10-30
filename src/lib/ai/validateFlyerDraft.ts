import type { AgentTurn } from '@/lib/ai/eventDraft';

type Details = AgentTurn['details'];

export type FlyerFacts = {
  /** Everything the model transcribed from the flyer */
  transcription: string;
  statedWeekday: string | null;
  yearStated: boolean;
  /** Today in the organizer's time zone, YYYY-MM-DD */
  today: string;
};

/**
 * A problem worth a second look at the flyer. `recheck` problems are likely misreads
 * (a date that does not fall on the printed weekday, a price that is not on the flyer);
 * the rest only flag the field for the organizer.
 */
export type DraftIssue = { field: string; message: string; recheck: boolean };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects dates that roll over, such as 2026-02-30
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function withYear(value: string, year: number) {
  return parseDate(`${year}${value.slice(4)}`);
}

function weekdayIndex(name: string | null) {
  if (!name) return -1;
  const n = name.trim().toLowerCase();
  if (n.length < 3) return -1;
  return WEEKDAYS.findIndex((w) => w.startsWith(n.slice(0, 3)));
}

function validTime(value: string | null) {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validZone(zone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Lowercase letters and digits only, so "₹1,500/-" and "1500" compare equal. */
function squash(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}@.]/gu, '');
}

function words(text: string) {
  return text.toLowerCase().normalize('NFKD').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
}

/** Share of the value's words that are printed on the flyer. */
function grounding(value: string, transcription: string) {
  const printed = new Set(words(transcription));
  const own = words(value);
  if (!own.length) return 1;
  return own.filter((w) => printed.has(w)).length / own.length;
}

/** Whether the number is printed on the flyer; zero passes because free tiers rarely print a 0. */
function numberIsPrinted(value: number, transcription: string) {
  if (value === 0) return true;
  const flat = transcription.replace(/(\d),(?=\d)/g, '$1');
  const printed = new Set((flat.match(/\d+(?:\.\d+)?/g) || []).map(Number));
  return printed.has(value);
}

/**
 * Checks a flyer draft against the flyer's own text and the calendar, fixes what can be fixed
 * without guessing, and returns the problems that remain. Never invents a value.
 */
export function validateFlyerDraft(input: Details, facts: FlyerFacts) {
  const details: Details = { ...input, ticketTypes: [...input.ticketTypes], uncertainFields: [...input.uncertainFields] };
  const issues: DraftIssue[] = [];
  const flag = (field: string, message: string, recheck = false) => issues.push({ field, message, recheck });
  const { transcription } = facts;
  const hasText = transcription.trim().length > 0;

  // Dates
  const today = parseDate(facts.today);
  let start = parseDate(details.startDate);
  if (details.startDate && !start) {
    flag('startDate', `"${details.startDate}" is not a real calendar date.`, true);
    details.startDate = null;
  }
  let end = parseDate(details.endDate);
  if (details.endDate && !end) {
    flag('endDate', `"${details.endDate}" is not a real calendar date.`, true);
    details.endDate = null;
  }

  // With no printed year, the event is the next occurrence: move a past date forward a year.
  if (start && today && !facts.yearStated && start < today) {
    const shift = start.getUTCFullYear() + 1;
    const moved = withYear(iso(start), shift);
    if (moved) {
      start = moved;
      details.startDate = iso(moved);
      if (end) {
        end = withYear(iso(end), end.getUTCFullYear() + 1);
        details.endDate = end ? iso(end) : null;
      }
    }
  }

  const weekday = weekdayIndex(facts.statedWeekday);
  if (start && weekday >= 0 && start.getUTCDay() !== weekday) {
    // Without a printed year, the printed weekday decides between this year and the next two.
    const base = today ? today.getUTCFullYear() : start.getUTCFullYear();
    const match = facts.yearStated
      ? null
      : [base, base + 1, base + 2]
          .map((y) => withYear(iso(start!), y))
          .find((d) => d && d.getUTCDay() === weekday && (!today || d >= today));
    if (match) {
      const offset = match.getUTCFullYear() - start.getUTCFullYear();
      start = match;
      details.startDate = iso(match);
      if (end) {
        end = withYear(iso(end), end.getUTCFullYear() + offset);
        details.endDate = end ? iso(end) : null;
      }
    } else {
      flag(
        'startDate',
        `${details.startDate} is a ${capitalize(WEEKDAYS[start.getUTCDay()])}, but the flyer says ${facts.statedWeekday}.`,
        true,
      );
    }
  }

  if (start && !end && details.startDate) details.endDate = details.startDate;
  if (start && end && end < start) flag('endDate', `The end date ${details.endDate} is before the start date ${details.startDate}.`, true);
  if (start && today && start < today && facts.yearStated) flag('startDate', `${details.startDate} is in the past.`);

  // Times
  for (const key of ['startTime', 'endTime'] as const) {
    const value = details[key];
    if (value && !validTime(value)) {
      flag(key, `"${value}" is not a 24-hour time.`, true);
      details[key] = null;
    }
  }
  if (
    details.startTime &&
    details.endTime &&
    (details.endDate ?? details.startDate) === details.startDate &&
    details.endTime <= details.startTime
  ) {
    flag('endTime', `The end time ${details.endTime} is not after the start time ${details.startTime}.`, true);
  }

  if (details.timezone && !validZone(details.timezone)) {
    flag('timezone', `"${details.timezone}" is not a recognised time zone.`);
    details.timezone = null;
  }

  // Values that must be printed on the flyer exactly
  if (details.contactEmail) {
    const email = details.contactEmail.trim();
    details.contactEmail = email;
    if (!EMAIL.test(email)) {
      flag('contactEmail', `"${email}" is not a valid email address.`, true);
    } else if (hasText && !squash(transcription).includes(squash(email))) {
      flag('contactEmail', `The email ${email} does not appear in the flyer text.`, true);
    }
  }

  if (hasText) {
    details.ticketTypes.forEach((t) => {
      if (!numberIsPrinted(t.price, transcription)) {
        flag('ticketTypes', `The ${t.name} price ${t.price} does not appear on the flyer.`, true);
      }
    });
    if (details.capacity !== null && !numberIsPrinted(details.capacity, transcription)) {
      flag('capacity', `The capacity ${details.capacity} is not printed on the flyer.`, true);
    }
    if (details.name && grounding(details.name, transcription) < 0.6) {
      flag('name', `The event name "${details.name}" does not match the flyer text closely.`, true);
    }
    if (details.venue && grounding(details.venue, transcription) < 0.5) {
      flag('venue', `The venue "${details.venue}" does not match the flyer text closely.`, true);
    }
  }

  // Anything flagged is something the organizer should look at.
  const uncertain = new Set(details.uncertainFields);
  for (const issue of issues) uncertain.add(issue.field);
  details.uncertainFields = [...uncertain];

  const penalty = issues.reduce((sum, i) => sum + (i.recheck ? 0.15 : 0.05), 0);
  details.confidence = Math.max(0, Math.min(1, details.confidence) - penalty);

  return { details, issues };
}
