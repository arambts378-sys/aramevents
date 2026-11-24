/**
 * Readable dates and times for event websites. The database stores "2026-11-25" and "18:00:00";
 * visitors should see "25 November 2026" and "6:00 pm".
 */

const ISO_DATE = /\d{4}-\d{2}-\d{2}/;

function toDate(iso?: string | null): Date | null {
  const m = iso?.match(ISO_DATE)?.[0];
  if (!m) return null;
  const d = new Date(`${m}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "18:00:00" → "6:00 pm". Text that isn't a 24-hour time is returned as it is. */
export function formatClock(time?: string | null): string {
  const raw = (time || '').trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return raw;
  const h = Number(m[1]);
  if (h > 23) return raw;
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'pm' : 'am'}`;
}

/**
 * "25 November 2026", "25–26 November 2026", "30 November – 2 December 2026" or
 * "30 December 2026 – 1 January 2027". The day (or day range) comes first so layouts can show it large.
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  const s = toDate(start);
  if (!s) return '';
  const e = toDate(end);
  const day = (d: Date) => String(d.getDate());
  const month = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long' });
  if (!e || e.getTime() <= s.getTime()) return `${day(s)} ${month(s)} ${s.getFullYear()}`;
  if (s.getFullYear() !== e.getFullYear()) {
    return `${day(s)} ${month(s)} ${s.getFullYear()} – ${day(e)} ${month(e)} ${e.getFullYear()}`;
  }
  if (s.getMonth() !== e.getMonth()) return `${day(s)} ${month(s)} – ${day(e)} ${month(e)} ${e.getFullYear()}`;
  return `${day(s)}–${day(e)} ${month(s)} ${s.getFullYear()}`;
}

/** "9:00 am – 6:00 pm" */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = formatClock(start);
  const e = formatClock(end);
  if (s && e && s !== e) return `${s} – ${e}`;
  return s || e;
}

const clean = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim() !== 'undefined' && v.trim() !== 'null' ? v.trim() : '');
/** Text the organizer typed (e.g. "Every Saturday"), minus "undefined"/"null" left by missing values. */
const freeText = (v: unknown) =>
  clean(v).replace(/\b(?:undefined|null)\b/g, '').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();

/**
 * Gives an event the fields website sections read: raw startDate/endDate/startTime/endTime, plus
 * readable `date` and `time`. Accepts the public page's shape ("2026-11-25 - 2026-11-25" in `date`),
 * the editor's camelCase event, or database snake_case.
 */
export interface DisplayDateTime {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  date: string;
  time: string;
}

export function withDisplayDateTime<T extends Record<string, unknown>>(event: T): T & DisplayDateTime {
  const e = event as Record<string, unknown>;
  const dates = clean(e.date).match(new RegExp(ISO_DATE.source, 'g')) || [];
  const times = clean(e.time).split(/\s+[-–]\s+/).map(clean);

  const startDate = clean(e.startDate) || clean(e.start_date) || dates[0] || '';
  const endDate = clean(e.endDate) || clean(e.end_date) || dates[1] || startDate;
  const startTime = clean(e.startTime) || clean(e.start_time) || (/^\d{1,2}:\d{2}/.test(times[0] || '') ? times[0] : '');
  const endTime = clean(e.endTime) || clean(e.end_time) || (/^\d{1,2}:\d{2}/.test(times[1] || '') ? times[1] : '');

  const date = formatDateRange(startDate, endDate) || (dates.length ? '' : freeText(e.date));
  const time = formatTimeRange(startTime, endTime) || (startTime || endTime ? '' : freeText(e.time));

  return {
    ...event,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    date: date || 'Date to be announced',
    time: time || 'Time to be announced',
  };
}
