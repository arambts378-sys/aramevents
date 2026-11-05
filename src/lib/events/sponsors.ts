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
