/**
 * The details a buyer typed, saved with their Razorpay order so the webhook can finish the booking
 * if their browser does not come back after paying. Only known fields are kept, as short strings;
 * everything is validated again when the booking is completed.
 */

const TICKET_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'organization',
  'job_title',
  'distance_category_id',
  'gender',
  'age',
  't_shirt_size',
  'emergency_contact_name',
  'emergency_contact_phone',
  'city',
  'medical_notes',
] as const;

const SPONSOR_FIELDS = [
  'package_id',
  'organization',
  'contact_name',
  'contact_email',
  'contact_phone',
  'website_url',
  'message',
  'custom_amount',
  'gstin',
] as const;

function pick(input: unknown, fields: readonly string[], maxLength: number) {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const field of fields) {
    const value = source[field];
    if (typeof value === 'string' && value.trim()) out[field] = value.trim().slice(0, maxLength);
    else if (typeof value === 'number' && Number.isFinite(value)) out[field] = String(value);
  }
  return out;
}

export function ticketCheckoutPayload(input: unknown) {
  return pick(input, TICKET_FIELDS, 500);
}

export function sponsorCheckoutPayload(input: unknown) {
  return pick(input, SPONSOR_FIELDS, 1000);
}
