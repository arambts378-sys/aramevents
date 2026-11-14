import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidWebhookSignature, paymentMethodOf, razorpayWebhookSecret } from '@/lib/payments/razorpay';
import { completeTicketRegistration } from '@/services/bookings/ticketBooking.server';
import { completeSponsorRequest } from '@/services/bookings/sponsorBooking.server';
import type { SponsorKind } from '@/lib/events/sponsors';
import type { SponsorRequestValues } from '@/lib/validation/forms';

/** Events that mean money was taken for an order. Set these in the Razorpay dashboard. */
const PAID_EVENTS = new Set(['payment.captured', 'payment.authorized', 'order.paid']);

type PaymentEntity = { id?: string; order_id?: string; amount?: number; status?: string } & Record<string, unknown>;

/**
 * Razorpay webhook. Razorpay calls it for every payment, whether or not the buyer's browser
 * comes back, so:
 * 1. a payment is marked paid even when the browser never reported it;
 * 2. if the buyer closed the page after paying, the ticket or sponsor request is completed here
 *    from the details saved with the order, or refunded if it cannot be (event full, refused...).
 * The browser and this webhook may finish the same order at the same time; the booking code
 * makes sure it is booked (or refunded) once.
 *
 * Answers 2xx for anything it has handled or deliberately ignores, and 5xx only for temporary
 * problems, so Razorpay retries those.
 */
export async function POST(request: Request) {
  const secret = razorpayWebhookSecret();
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });

  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get('x-razorpay-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let body: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const event = body.event ?? '';
  const payment = body.payload?.payment?.entity;
  if (!PAID_EVENTS.has(event) || !payment?.order_id || !payment.id) {
    return NextResponse.json({ ok: true, ignored: event || 'unknown' });
  }

  try {
    const outcome = await handlePaidOrder(payment.order_id, payment);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    console.error('[razorpay webhook] failed', { event, order: payment.order_id, message: (err as Error)?.message });
    return NextResponse.json({ error: 'Temporary failure, please retry.' }, { status: 500 });
  }
}

async function handlePaidOrder(orderId: string, payment: PaymentEntity) {
  const db = createAdminClient();

  let source: 'ticket' | 'sponsor' = 'ticket';
  let { data: row } = await db
    .from('ticket_payments')
    .select('id, status, amount, event_id, ticket_type_id, checkout_payload')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!row) {
    source = 'sponsor';
    const sponsorRow = await db
      .from('sponsor_payments')
      .select('id, status, amount, event_id, kind, checkout_payload')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    row = sponsorRow.data as typeof row;
  }
  if (!row) return 'unknown_order'; // not created by this site
  const table = source === 'ticket' ? 'ticket_payments' : 'sponsor_payments';

  if (Number(payment.amount) !== Number(row.amount)) {
    console.error('[razorpay webhook] amount mismatch', { order: orderId });
    return 'amount_mismatch';
  }

  // 1. Record the payment if the browser has not (same rules as the verify route).
  if (row.status === 'created') {
    await db
      .from(table)
      .update({ status: 'paid', razorpay_payment_id: payment.id, paid_at: new Date().toISOString(), ...paymentMethodOf(payment) })
      .eq('id', row.id)
      .eq('status', 'created');
    row.status = 'paid';
  }
  if (row.status !== 'paid') return `already_${row.status}`; // booked, refunded or failed

  // 2. Paid but not booked: the buyer may have closed the page. Finish it from the saved details.
  const saved = (row.checkout_payload ?? null) as Record<string, string> | null;
  if (!saved?.email && !saved?.contact_email) return 'paid_no_details';

  if (source === 'ticket') {
    const result = await completeTicketRegistration(row.event_id, {
      first_name: saved.first_name ?? '',
      last_name: saved.last_name,
      email: saved.email,
      phone: saved.phone,
      organization: saved.organization,
      job_title: saved.job_title,
      distance_category_id: saved.distance_category_id,
      gender: saved.gender,
      age: saved.age,
      t_shirt_size: saved.t_shirt_size,
      emergency_contact_name: saved.emergency_contact_name,
      emergency_contact_phone: saved.emergency_contact_phone,
      ticket_type_id: (row as { ticket_type_id?: string }).ticket_type_id,
      quantity: 1,
      payment_order_id: orderId,
    });
    return result.ok ? 'ticket_booked' : `ticket_not_booked_${result.payment ?? 'not_refunded'}`;
  }

  const kind: SponsorKind = (row as { kind?: string }).kind === 'partner' ? 'partner' : 'sponsor';
  const form: SponsorRequestValues = {
    package_id: saved.package_id ?? '',
    organization: saved.organization ?? '',
    contact_name: saved.contact_name ?? '',
    contact_email: saved.contact_email ?? '',
    contact_phone: saved.contact_phone ?? '',
    website_url: saved.website_url ?? '',
    message: saved.message ?? '',
    custom_amount: saved.custom_amount ?? '',
    gstin: saved.gstin ?? '',
  };
  const result = await completeSponsorRequest(row.event_id, kind, form, '', orderId);
  return result.ok ? 'sponsor_request_saved' : `sponsor_request_not_saved_${result.payment ?? 'not_refunded'}`;
}
