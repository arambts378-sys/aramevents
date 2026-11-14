const WEEKDAY = /\(\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*\)/gi;
const ZONE = /\(\s*(IST|UTC|GMT|[A-Z]{2,4}T|UTC\s*[+-]\s*\d{1,2}(:\d{2})?)\s*\)/g;

/**
 * Removes day and time-zone fragments that a flyer read can leave in the location, such as
 * "(Tuesday) (IST), Chennai", so the venue reads cleanly. Returns '' when nothing is left.
 */
export function cleanLocation(location?: string | null): string {
  if (!location) return '';
  return location
    .replace(WEEKDAY, '')
    .replace(ZONE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,·|-]+|[\s,·|-]+$/g, '')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .trim();
}
