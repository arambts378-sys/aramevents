"use server";

import { completeTicketRegistration, type RegistrationActionResult, type TicketPersonData } from '@/services/bookings/ticketBooking.server';

export type { RegistrationActionResult } from '@/services/bookings/ticketBooking.server';

/**
 * Public registration from the event's registration form. The work is shared with the Razorpay
 * webhook, which finishes paid registrations when the buyer's browser does not come back.
 */
export async function submitRegistrationServerAction(
  eventId: string,
  personData: TicketPersonData,
): Promise<RegistrationActionResult> {
  return completeTicketRegistration(eventId, personData);
}
