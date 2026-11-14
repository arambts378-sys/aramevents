/** Sponsors and partners of an event, and what each still owes. Amounts are in paise. */

export type SponsorKind = 'sponsor' | 'partner';

/** Requests from the public form start as pending. Organizers' own entries are approved. */
export type SponsorRequestStatus = 'pending' | 'approved' | 'declined';

export interface SponsorPackage {
  id: string;
  event_id: string;
  kind: SponsorKind;
  name: string;
  amount: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type PublicSponsorPackage = Pick<SponsorPackage, 'id' | 'kind' | 'name' | 'amount' | 'description'>;

/** The "package" a sponsor picks to pay an amount of their choice, or a partner to apply without one. */
export const CUSTOM_PACKAGE_ID = 'custom';

/** What the organizer allows on the public form, from event_registration_settings. */
export interface SponsorOptions {
  /** Sponsors may pay an amount of their choice */
  acceptCustomSponsorship: boolean;
  /** Smallest custom sponsorship, in paise */
  customSponsorshipMin: number;
  /** Partners may apply without a package */
  acceptPartnerRequests: boolean;
}

export const DEFAULT_SPONSOR_OPTIONS: SponsorOptions = {
  acceptCustomSponsorship: true,
  customSponsorshipMin: 50000,
  acceptPartnerRequests: true,
};

/** Reads the options from a settings row; columns missing before the migration fall back to off. */
export function sponsorOptionsFrom(settings: Record<string, unknown> | null | undefined): SponsorOptions {
  return {
    acceptCustomSponsorship: settings?.accept_custom_sponsorship === true,
    customSponsorshipMin: Number(settings?.custom_sponsorship_min) >= 100 ? Number(settings?.custom_sponsorship_min) : DEFAULT_SPONSOR_OPTIONS.customSponsorshipMin,
    acceptPartnerRequests: settings?.accept_partner_requests === true,
  };
}

/** Which kinds can be requested on the public form: a package exists, or the organizer allows custom. */
export function sponsorKindsOffered(packages: Pick<PublicSponsorPackage, 'kind'>[], options: SponsorOptions) {
  return {
    sponsor: options.acceptCustomSponsorship || packages.some((p) => p.kind === 'sponsor'),
    partner: options.acceptPartnerRequests || packages.some((p) => p.kind === 'partner'),
  };
}

/** GST added on top of sponsor and partner amounts, in percent. */
export const SPONSOR_GST_RATE = 18;

/** A sponsor/partner amount before tax, the GST on it, and what is charged (all paise). */
export function withSponsorGst(base: number) {
  const gst = Math.round((base * SPONSOR_GST_RATE) / 100);
  return { base, gst, total: base + gst };
}

/** GSTIN: 2-digit state code + 13 characters, upper case. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z0-9]{13}$/;

/**
 * How the GST is split on the invoice: CGST + SGST when organizer and sponsor are in the same
 * state (or the sponsor gave no GSTIN), IGST when their GSTINs show different states.
 */
export function splitGst(gst: number, sellerGstin?: string | null, buyerGstin?: string | null) {
  const interState = Boolean(sellerGstin && buyerGstin && sellerGstin.slice(0, 2) !== buyerGstin.slice(0, 2));
  if (interState) return { cgst: 0, sgst: 0, igst: gst };
  const cgst = Math.floor(gst / 2);
  return { cgst, sgst: gst - cgst, igst: 0 };
}

/** Name shown for a custom choice on the form, the sponsor list and the invoice. */
export function customPackageName(kind: SponsorKind) {
  return kind === 'sponsor' ? 'Custom sponsorship' : 'Partnership';
}

export interface EventSponsor {
  id: string;
  event_id: string;
  kind: SponsorKind;
  name: string;
  tier: string | null;
  amount_agreed: number;
  amount_received: number;
  due_date: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  notes: string | null;
  show_on_website: boolean;
  package_id: string | null;
  request_status: SponsorRequestStatus;
  created_at: string;
  updated_at: string;
}

export type SponsorPaymentStatus = 'not_charged' | 'unpaid' | 'part_paid' | 'paid' | 'overdue';

export const SPONSOR_PAYMENT_LABELS: Record<SponsorPaymentStatus, string> = {
  not_charged: 'No payment',
  unpaid: 'Unpaid',
  part_paid: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function sponsorBalance(sponsor: Pick<EventSponsor, 'amount_agreed' | 'amount_received'>) {
  return Math.max(0, sponsor.amount_agreed - sponsor.amount_received);
}

/** `today` is a yyyy-mm-dd date, so a payment is only overdue the day after it was due. */
export function sponsorPaymentStatus(
  sponsor: Pick<EventSponsor, 'amount_agreed' | 'amount_received' | 'due_date'>,
  today: string,
): SponsorPaymentStatus {
  if (sponsor.amount_agreed === 0) return 'not_charged';
  if (sponsor.amount_received >= sponsor.amount_agreed) return 'paid';
  if (sponsor.due_date && sponsor.due_date < today) return 'overdue';
  return sponsor.amount_received > 0 ? 'part_paid' : 'unpaid';
}

/** Only approved entries are money the event expects, so requests stay out of the totals. */
export function summarizeSponsors(sponsors: EventSponsor[]) {
  return sponsors.filter((sponsor) => sponsor.request_status === 'approved').reduce(
    (total, sponsor) => ({
      agreed: total.agreed + sponsor.amount_agreed,
      received: total.received + sponsor.amount_received,
      balance: total.balance + sponsorBalance(sponsor),
    }),
    { agreed: 0, received: 0, balance: 0 },
  );
}

/** Rupees as typed in a form, in paise. Assumes the value already passed validation. */
export function rupeesToPaiseAmount(rupees: string) {
  return Math.round(parseFloat(rupees || '0') * 100);
}
