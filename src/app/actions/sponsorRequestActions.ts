"use server";

import { completeSponsorRequest, type SponsorRequestResult } from '@/services/bookings/sponsorBooking.server';
import type { SponsorRequestValues } from '@/lib/validation/forms';
import type { SponsorKind } from '@/lib/events/sponsors';

/**
 * A public sponsor or partner request from the registration page. The work is shared with the
 * Razorpay webhook, which finishes paid requests when the sponsor's browser does not come back.
 */
export async function submitSponsorRequestAction(
  eventId: string,
  kind: SponsorKind,
  form: SponsorRequestValues,
  trap: string,
  paymentOrderId?: string,
): Promise<SponsorRequestResult> {
  return completeSponsorRequest(eventId, kind, form, trap, paymentOrderId);
}
