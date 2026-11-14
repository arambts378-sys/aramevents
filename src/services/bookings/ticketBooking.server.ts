import 'server-only';

import { registrationsService } from '@/services/registrations';
import { processRegistrationIntegrationJobs } from '@/services/integrations/processor';
import { qrCredentialsService } from '@/services/qrCredentials';

import { createAdminClient } from '@/lib/supabase/admin';
import { refundUnusedTicketPayment } from '@/lib/payments/razorpay';
import { issueInvoice } from '@/lib/payments/invoices.server';
import { getActivityCorrelationId, recordPlatformActivity, resolveActivityWorkspace } from '@/services/platformActivity.server';

export type RegistrationActionResult =
  | {
      ok: true;
      registration_id: string;
      registration_number: string;
      qrToken?: string;
      /** The event has an email integration, so a ticket email was attempted. */
      emailQueued: boolean;
      emailDeliveryFailed: boolean;
      /** Private link to the invoice, for paid tickets */
      invoiceUrl?: string | null;
    }
  | {
      ok: false;
      error: string;
      /** For paid tickets: what happened to the money when the registration failed. */
      payment?: 'refunded' | 'released' | 'not_refunded';
    };

export type TicketPersonData = {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  organization?: string;
  job_title?: string;
  distance_category_id?: string;
  ticket_type_id?: string;
  quantity?: number;
  payment_order_id?: string;
  gender?: string;
  age?: string;
  t_shirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
};

/**
 * The registration a paid order already created, when the same order is finished twice: by the
 * browser and by the Razorpay webhook. Only the payer has the order ID, and the email must match.
 */
async function registrationForOrder(orderId: string, email: string) {
  const db = createAdminClient();
  const { data: payment } = await db
    .from('ticket_payments')
    .select('status, email, registration_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!payment || payment.status !== 'used' || !payment.registration_id) return null;
  if (payment.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  const { data: reg } = await db
    .from('registrations')
    .select('id, registration_number')
    .eq('id', payment.registration_id)
    .maybeSingle();
  return reg ? { success: true, registration_id: reg.id as string, registration_number: reg.registration_number as string } : null;
}

/**
 * Registers an attendee: the public form (through its server action) and the Razorpay webhook,
 * when a buyer paid but closed the page before the registration was sent. Returns errors instead
 * of throwing them: in production Next.js replaces thrown server action messages with a generic
 * one, and attendees need the real reason (sold out, already registered, refund status...).
 */
export async function completeTicketRegistration(
  eventId: string,
  personData: TicketPersonData,
): Promise<RegistrationActionResult> {
  let result: { success: boolean; registration_id: string; registration_number: string };
  // Set when this paid order was already booked (by the webhook or an earlier attempt).
  let alreadyBooked = false;
  try {
    const existing = personData.payment_order_id ? await registrationForOrder(personData.payment_order_id, personData.email) : null;
    if (existing) {
      result = existing;
      alreadyBooked = true;
    } else {
      // 1. Submit Registration (creates records + initial jobs in DB)
      result = await registrationsService.submitPublicRegistration(eventId, personData);
      if (!result?.success || !result.registration_id) throw new Error('Registration failed');
    }
  } catch (error) {
    // Lost a race with the other finisher of this order: that one booked it, so this is a success.
    const raced = personData.payment_order_id ? await registrationForOrder(personData.payment_order_id, personData.email) : null;
    if (raced) return completeTicketRegistration(eventId, personData);

    await recordPlatformActivity({
      workspaceId: await resolveActivityWorkspace(eventId),
      action: 'registration.failed',
      resourceType: 'event',
      resourceId: eventId,
      outcome: 'failure',
      errorCode: 'REGISTRATION_FAILED',
      correlationId: getActivityCorrelationId(),
    });
    const message = (error as Error)?.message || 'Registration failed. Please try again.';

    // The attendee already paid but did not get a ticket: give the money back.
    if (personData.payment_order_id) {
      const payment = await refundUnusedTicketPayment(personData.payment_order_id, message);
      return { ok: false, error: message, payment };
    }
    return { ok: false, error: message };
  }

  // 2. Generate the QR credential. The registration is already saved, so a failure here
  //    is reported to the attendee without undoing (or refunding) the booking.
  let qrToken: string | undefined;
  try {
    let credential = await qrCredentialsService.getQrCredential(result.registration_id);
    if (!credential) {
      const genResult = await qrCredentialsService.generateQrCredential(eventId, result.registration_id, true);
      credential = genResult.credential;
    }
    if (credential) qrToken = qrCredentialsService.recoverRawToken(credential.id, credential.credential_token_hash);
  } catch (error) {
    console.error('QR ticket generation failed', error);
  }
  if (!qrToken) {
    await recordPlatformActivity({
      workspaceId: await resolveActivityWorkspace(eventId),
      action: 'ticket.generation_failed',
      resourceType: 'registration',
      resourceId: result.registration_id,
      outcome: 'failure',
      errorCode: 'TICKET_GENERATION_FAILED',
      correlationId: getActivityCorrelationId(),
    });
  }

  // 2b. Invoice for a paid ticket
  let invoiceUrl: string | null = null;
  if (personData.payment_order_id) {
    const supabase = createAdminClient();
    // The booking is done: the saved checkout details are no longer needed.
    await supabase.from('ticket_payments').update({ checkout_payload: null }).eq('razorpay_order_id', personData.payment_order_id);
    const { data: ticket } = personData.ticket_type_id
      ? await supabase.from('event_ticket_types').select('name').eq('id', personData.ticket_type_id).maybeSingle()
      : { data: null };
    const { data: ev } = await supabase.from('events').select('name').eq('id', eventId).maybeSingle();
    invoiceUrl = await issueInvoice({
      source: 'ticket',
      orderId: personData.payment_order_id,
      description: `${ticket?.name ?? 'Ticket'} — ${ev?.name ?? 'Event'} (${result.registration_number})`,
      buyer: {
        name: `${personData.first_name} ${personData.last_name ?? ''}`.trim(),
        email: personData.email,
        phone: personData.phone,
        organization: personData.organization,
      },
      registrationId: result.registration_id,
    });
  }

  // 3. Queue Email Delivery if enabled
  let emailDeliveryFailed = false;
  let emailQueued = false;
  try {
    const supabase = createAdminClient();
    const { data: integrations } = await supabase
      .from('event_integrations')
      .select('provider')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .eq('is_active', true)
      .maybeSingle();

    // An order finished twice sends the ticket email once: the first finisher already sent it.
    if (integrations && alreadyBooked) {
      emailQueued = true;
    } else if (integrations) {
      emailQueued = true;
      const payload = {
        registrationId: result.registration_id,
        registrationNumber: result.registration_number,
        attendee: {
          firstName: personData.first_name,
          lastName: personData.last_name,
          email: personData.email,
          phone: personData.phone
        }
      };

      const idempotencyKey = `${eventId}:${result.registration_id}:email:qr_delivery`;

      await supabase.from('integration_jobs').insert({
        event_id: eventId,
        registration_id: result.registration_id,
        provider: 'email',
        event_type: 'qr_delivery',
        payload: payload,
        idempotency_key: idempotencyKey,
        next_attempt_at: new Date().toISOString()
      }).select('*').maybeSingle(); // This will safely fail on conflict (duplicate) due to idempotency_key

      // Try to process immediately
      await processRegistrationIntegrationJobs(result.registration_id);
    }
  } catch (emailErr) {
    await recordPlatformActivity({
      workspaceId: await resolveActivityWorkspace(eventId),
      action: 'integration.delivery_failed',
      resourceType: 'registration',
      resourceId: result.registration_id,
      outcome: 'failure',
      errorCode: 'EMAIL_DELIVERY_FAILED',
      correlationId: getActivityCorrelationId(),
      metadata: { provider: 'email', eventType: 'qr_delivery' },
    });
    console.error("Email queuing/processing failed", emailErr);
    emailDeliveryFailed = true;
  }

  return {
    ok: true,
    registration_id: result.registration_id,
    registration_number: result.registration_number,
    qrToken,
    emailQueued,
    emailDeliveryFailed,
    invoiceUrl,
  };
}
