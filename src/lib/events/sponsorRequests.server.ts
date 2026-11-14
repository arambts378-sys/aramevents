import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPublicRegistrationEnabled } from '@/lib/security/publicRegistration';
import { CUSTOM_PACKAGE_ID, SponsorKind, customPackageName, sponsorOptionsFrom, withSponsorGst } from '@/lib/events/sponsors';

/** Enough for a busy event, while stopping a script from filling an organizer's list. */
export const MAX_PENDING_SPONSOR_REQUESTS = 100;

/** Largest amount taken online in one payment (paise): ₹10,00,000. */
export const MAX_ONLINE_SPONSOR_AMOUNT = 100_000_000;

export const SPONSOR_REQUESTS_CLOSED = 'Sponsorship requests are not open for this event right now.';
export const SPONSOR_REQUEST_ALREADY_PENDING = 'A request from this email is already waiting for a reply.';

/**
 * What is being bought: a package, or a custom amount (packageId null). In paise: `base` before tax,
 * `gst` the 18% GST on it, `amount` what is charged (base + gst).
 */
export type SponsorChoice = { packageId: string | null; kind: SponsorKind; name: string; base: number; gst: number; amount: number };

type Db = ReturnType<typeof createAdminClient>;

export type SponsorCheck =
  | { ok: true; choice: SponsorChoice; customMin: number }
  | { ok: false; reason: 'closed' | 'package' | 'amount' | 'pending'; message: string };

/**
 * Everything that must be true before a public sponsor/partner request is accepted, checked
 * before taking any money too, so nobody pays for a request that would then be refused.
 * `customAmount` (paise, before GST) is only used when `packageId` is 'custom'.
 */
export async function checkSponsorRequest(
  db: Db,
  input: { eventId: string; kind: SponsorKind; packageId: string; customAmount: number; email: string },
): Promise<SponsorCheck> {
  const { eventId, kind, packageId, customAmount, email } = input;
  const { data: settings } = await db
    .from('event_registration_settings')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();
  if (!isPublicRegistrationEnabled(settings)) return { ok: false, reason: 'closed', message: SPONSOR_REQUESTS_CLOSED };
  const options = sponsorOptionsFrom(settings);

  let choice: SponsorChoice;
  if (packageId === CUSTOM_PACKAGE_ID) {
    const allowed = kind === 'sponsor' ? options.acceptCustomSponsorship : options.acceptPartnerRequests;
    if (!allowed) return { ok: false, reason: 'package', message: 'Choose one of the packages.' };
    const amount = Math.round(Number(customAmount) || 0);
    if (amount < 0 || amount > MAX_ONLINE_SPONSOR_AMOUNT) {
      return { ok: false, reason: 'amount', message: 'For this amount, please contact the organizer directly.' };
    }
    // Sponsors always pay something; partners may apply without a fee, or offer one above the minimum.
    if ((kind === 'sponsor' || amount > 0) && amount < options.customSponsorshipMin) {
      return {
        ok: false,
        reason: 'amount',
        message: `The minimum amount is ₹${(options.customSponsorshipMin / 100).toLocaleString('en-IN')}.`,
      };
    }
    const tax = withSponsorGst(amount);
    choice = { packageId: null, kind, name: customPackageName(kind), base: tax.base, gst: tax.gst, amount: tax.total };
  } else {
    const { data: pkg } = await db
      .from('event_sponsor_packages')
      .select('id, kind, name, amount')
      .eq('id', packageId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .maybeSingle();
    if (!pkg) return { ok: false, reason: 'package', message: 'This package is no longer available. Choose another.' };
    const tax = withSponsorGst(Number(pkg.amount));
    choice = { packageId: pkg.id, kind: pkg.kind as SponsorKind, name: pkg.name, base: tax.base, gst: tax.gst, amount: tax.total };
  }

  const { count: alreadyPending } = await db
    .from('event_sponsors')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('contact_email', email)
    .eq('request_status', 'pending');
  if (alreadyPending) return { ok: false, reason: 'pending', message: SPONSOR_REQUEST_ALREADY_PENDING };

  const { count: pending } = await db
    .from('event_sponsors')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('request_status', 'pending');
  if ((pending ?? 0) >= MAX_PENDING_SPONSOR_REQUESTS) return { ok: false, reason: 'closed', message: SPONSOR_REQUESTS_CLOSED };

  return { ok: true, choice, customMin: options.customSponsorshipMin };
}
