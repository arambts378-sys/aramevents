/**
 * Field-by-field validation for the event forms.
 *
 * Each function returns one message per invalid field, keyed by the input's `name`,
 * so the form can show it directly under that input. An empty result means valid.
 */
import { validateEmail } from './auth';

export type FieldErrors = Record<string, string>;

const PHONE_REGEX = /^\+?[0-9][0-9\s()-]{6,18}$/;
const URL_REGEX = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
/** ₹999 crore: well above any real amount, and safe to store in paise. */
const MAX_RUPEES = 9_99_99_99_999;

export function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}

/** The errors with one field's message removed, for clearing it as soon as the field is edited. */
export function withoutFieldError(errors: FieldErrors, field: string): FieldErrors {
  if (!errors[field]) return errors;
  const remaining = { ...errors };
  delete remaining[field];
  return remaining;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredText(value: unknown, label: string, max: number) {
  const trimmed = text(value);
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

function optionalLength(value: unknown, label: string, max: number) {
  return text(value).length > max ? `${label} must be ${max} characters or fewer.` : null;
}

function optionalEmail(value: unknown) {
  return text(value) ? validateEmail(value) : null;
}

function phone(value: unknown, label = 'Phone number', required = false) {
  const trimmed = text(value);
  if (!trimmed) return required ? `${label} is required.` : null;
  return PHONE_REGEX.test(trimmed) ? null : `Enter a valid ${label.toLowerCase()}, like +91 98765 43210.`;
}

function websiteUrl(value: unknown) {
  const trimmed = text(value);
  if (!trimmed) return null;
  return URL_REGEX.test(trimmed) && trimmed.length <= 300 ? null : 'Enter a full link starting with https://';
}

/** Rupees with at most two decimals. */
function money(value: unknown, label: string) {
  const trimmed = text(value);
  if (!trimmed) return `${label} is required. Enter 0 if there is none.`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return `${label} must be a number with up to 2 decimals, and not negative.`;
  if (Number(trimmed) > MAX_RUPEES) return `${label} is too large.`;
  return null;
}

function wholeNumber(value: unknown, label: string, min: number, max = 1_000_000) {
  const trimmed = text(value);
  if (!/^-?\d+$/.test(trimmed)) return `${label} must be a whole number.`;
  const n = Number(trimmed);
  if (n < min) return `${label} must be at least ${min}.`;
  if (n > max) return `${label} must be ${max.toLocaleString('en-IN')} or less.`;
  return null;
}

function collect(entries: Record<string, string | null>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [field, message] of Object.entries(entries)) {
    if (message) errors[field] = message;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Sponsors and partners
// ---------------------------------------------------------------------------
export interface SponsorFormValues {
  name: string;
  tier: string;
  amount_agreed: string;
  amount_received: string;
  due_date: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  notes: string;
}

export function validateSponsorForm(form: SponsorFormValues): FieldErrors {
  const errors = collect({
    name: requiredText(form.name, 'Name', 120),
    tier: optionalLength(form.tier, 'Level', 60),
    amount_agreed: money(form.amount_agreed, 'Agreed amount'),
    amount_received: money(form.amount_received, 'Amount received'),
    contact_name: optionalLength(form.contact_name, 'Contact name', 120),
    contact_email: optionalEmail(form.contact_email),
    contact_phone: phone(form.contact_phone),
    website_url: websiteUrl(form.website_url),
    notes: optionalLength(form.notes, 'Notes', 1000),
  });
  if (!errors.amount_agreed && !errors.amount_received && Number(form.amount_received) > Number(form.amount_agreed)) {
    errors.amount_received = 'Amount received cannot be more than the agreed amount.';
  }
  return errors;
}

export function validatePaymentAmount(amount: string, balanceRupees: number): FieldErrors {
  const error = money(amount, 'Amount');
  if (error) return { amount: error };
  if (Number(amount) <= 0) return { amount: 'Amount must be more than ₹0.' };
  if (Number(amount) > balanceRupees) return { amount: `Amount cannot be more than the balance of ₹${balanceRupees.toLocaleString('en-IN')}.` };
  return {};
}

export function validatePackageForm(form: { name: string; amount: string; description: string }): FieldErrors {
  return collect({
    name: requiredText(form.name, 'Package name', 80),
    amount: money(form.amount, 'Amount'),
    description: optionalLength(form.description, 'Description', 500),
  });
}

export interface SponsorRequestValues {
  package_id: string;
  organization: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  message: string;
}

/** Runs in the browser for feedback and again on the server, which is what enforces it. */
export function validateSponsorRequest(form: SponsorRequestValues): FieldErrors {
  return collect({
    package_id: text(form.package_id) ? null : 'Choose a package.',
    organization: requiredText(form.organization, 'Organization name', 120),
    contact_name: requiredText(form.contact_name, 'Your name', 120),
    contact_email: validateEmail(form.contact_email),
    contact_phone: phone(form.contact_phone, 'Phone number', true),
    website_url: websiteUrl(form.website_url),
    message: optionalLength(form.message, 'Message', 1000),
  });
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
export interface TicketFormValues {
  name: string;
  description: string;
  ticket_type: string;
  price_in_rupees: string;
  quantity_total: string;
  sales_start_at: string;
  sales_end_at: string;
  min_per_order: string;
  max_per_order: string;
}

export function validateTicketForm(form: TicketFormValues, quantitySold = 0): FieldErrors {
  const errors = collect({
    name: requiredText(form.name, 'Ticket name', 100),
    description: optionalLength(form.description, 'Description', 500),
    quantity_total: wholeNumber(form.quantity_total, 'Number of tickets', 1),
    min_per_order: wholeNumber(form.min_per_order, 'Minimum per order', 1, 100),
    max_per_order: wholeNumber(form.max_per_order, 'Maximum per order', 1, 100),
  });

  if (form.ticket_type === 'paid') {
    const priceError = money(form.price_in_rupees, 'Price');
    if (priceError) errors.price_in_rupees = priceError;
    else if (Number(form.price_in_rupees) <= 0) errors.price_in_rupees = 'Paid tickets must cost more than ₹0.';
  }
  if (!errors.quantity_total && Number(form.quantity_total) < quantitySold) {
    errors.quantity_total = `Cannot be lower than the ${quantitySold} already sold.`;
  }
  if (!errors.min_per_order && !errors.max_per_order && Number(form.max_per_order) < Number(form.min_per_order)) {
    errors.max_per_order = 'Maximum cannot be lower than the minimum.';
  }
  if (form.sales_start_at && form.sales_end_at && new Date(form.sales_end_at) <= new Date(form.sales_start_at)) {
    errors.sales_end_at = 'Sales must end after they start.';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export interface PersonFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
}

export function validatePersonForm(form: PersonFormValues): FieldErrors {
  return collect({
    first_name: requiredText(form.first_name, 'First name', 80),
    last_name: optionalLength(form.last_name, 'Last name', 80),
    email: validateEmail(form.email),
    phone: phone(form.phone),
    organization: optionalLength(form.organization, 'Organization', 120),
    job_title: optionalLength(form.job_title, 'Job title', 120),
  });
}

// ---------------------------------------------------------------------------
// Access zones
// ---------------------------------------------------------------------------
export interface ZoneFormValues {
  name: string;
  zone_type: string;
  description: string;
  location: string;
  entitlement_limit: string;
  entitlement_unit: string;
  distance_km: string;
  sequence: string;
}

export function validateZoneForm(form: ZoneFormValues): FieldErrors {
  const isFood = form.zone_type === 'Food Court';
  const isWalkathon = form.zone_type === 'Walkathon Checkpoint';
  return collect({
    name: requiredText(form.name, 'Zone name', 100),
    description: optionalLength(form.description, 'Description', 300),
    location: optionalLength(form.location, 'Location', 200),
    entitlement_limit:
      isFood && text(form.entitlement_limit) ? wholeNumber(form.entitlement_limit, 'Limit', 1, 100) : null,
    entitlement_unit: isFood ? optionalLength(form.entitlement_unit, 'Unit', 30) : null,
    distance_km:
      isWalkathon && text(form.distance_km) && !(Number(form.distance_km) >= 0)
        ? 'Distance must be 0 or more.'
        : null,
    sequence: isWalkathon && text(form.sequence) ? wholeNumber(form.sequence, 'Order', 1, 1000) : null,
  });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export function validateRegistrationSettings(form: {
  title: string;
  description: string;
  capacity: string | number;
  confirmation_message: string;
}): FieldErrors {
  return collect({
    title: optionalLength(form.title, 'Title', 150),
    description: optionalLength(form.description, 'Description', 1000),
    capacity: String(form.capacity).trim() ? wholeNumber(String(form.capacity), 'Maximum attendees', 1) : null,
    confirmation_message: optionalLength(form.confirmation_message, 'Confirmation message', 1000),
  });
}

export interface PublicRegistrationValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  distance_category_id: string;
  gender: string;
  age: string;
  t_shirt_size: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export function validatePublicRegistration(form: PublicRegistrationValues, isWalkathon: boolean): FieldErrors {
  const errors = collect({
    first_name: requiredText(form.first_name, 'First name', 80),
    last_name: requiredText(form.last_name, 'Last name', 80),
    email: validateEmail(form.email),
    phone: phone(form.phone, 'Phone number', true),
    organization: optionalLength(form.organization, 'Organization', 120),
    job_title: optionalLength(form.job_title, 'Job title', 120),
  });
  if (!isWalkathon) return errors;
  return {
    ...errors,
    ...collect({
      distance_category_id: form.distance_category_id ? null : 'Choose a distance.',
      gender: form.gender ? null : 'Choose an option.',
      age: wholeNumber(form.age, 'Age', 1, 120),
      t_shirt_size: form.t_shirt_size ? null : 'Choose a size.',
      emergency_contact_name: requiredText(form.emergency_contact_name, 'Emergency contact name', 120),
      emergency_contact_phone: phone(form.emergency_contact_phone, 'Emergency contact phone', true),
    }),
  };
}
