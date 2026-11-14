import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPublicRegistrationEnabled } from '@/lib/security/publicRegistration';
import { razorpayClient, razorpayKeys } from '@/lib/payments/razorpay';
import { ticketCheckoutPayload } from '@/lib/payments/checkoutPayload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a Razorpay order for one paid ticket. The amount always comes from the ticket in the
 * database, never from the browser. Public: attendees are not signed in.
 */
export async function POST(request: Request) {
  const keys = razorpayKeys();
  const razorpay = razorpayClient();
  if (!keys || !razorpay) {
    return NextResponse.json({ error: 'Online payment is not set up for this site yet.' }, { status: 503 });
  }

  let body: { eventId?: string; ticketTypeId?: string; email?: string; name?: string; phone?: string; checkout?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  if (!UUID.test(body.eventId ?? '') || !UUID.test(body.ticketTypeId ?? '') || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'Choose a ticket and enter a valid email first.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: event } = await db.from('events').select('id, name, status, workspace_id').eq('id', body.eventId!).maybeSingle();
  if (!event || event.status !== 'published') {
    return NextResponse.json({ error: 'This event is not open for registration.' }, { status: 404 });
  }
  const { data: settings } = await db.from('event_registration_settings').select('*').eq('event_id', event.id).maybeSingle();
  if (!isPublicRegistrationEnabled(settings)) {
    return NextResponse.json({ error: 'Registration is closed for this event.' }, { status: 409 });
  }

  // Event-wide capacity: never take money for an event that is already full. (If the last seat goes
  // while someone is paying, the registration fails and the payment is refunded automatically.)
  if (settings?.capacity != null) {
    const { count: active } = await db
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .in('status', ['pending', 'confirmed']);
    if ((active ?? 0) >= settings.capacity) {
      return NextResponse.json({ error: 'This event is full, so no more tickets can be booked.' }, { status: 409 });
    }
  }

  // Price, stock and sales window, as the public page sees them.
  const { data: availability } = await db.rpc('get_event_ticket_availability', { p_event_id: event.id });
  const ticket = (Array.isArray(availability) ? availability : []).find((t: { id: string }) => t.id === body.ticketTypeId) as
    | { id: string; name: string; ticket_type: string; price_amount: number; currency: string; status: string }
    | undefined;
  if (!ticket) return NextResponse.json({ error: 'This ticket is no longer available.' }, { status: 404 });
  if (ticket.ticket_type !== 'paid' || !(ticket.price_amount > 0)) {
    return NextResponse.json({ error: 'This ticket is free, so no payment is needed.' }, { status: 400 });
  }
  if (ticket.status !== 'on_sale') {
    return NextResponse.json({ error: ticket.status === 'sold_out' ? 'This ticket is sold out.' : 'This ticket is not on sale right now.' }, { status: 409 });
  }

  // Do not take money from someone who is already registered.
  const { data: person } = await db.from('people').select('id').eq('workspace_id', event.workspace_id).ilike('email', email).maybeSingle();
  if (person) {
    const { count } = await db
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('person_id', person.id)
      .in('status', ['pending', 'confirmed']);
    if (count) return NextResponse.json({ error: 'This email is already registered for the event. Check your inbox for the ticket.' }, { status: 409 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: ticket.price_amount, // paise
      currency: ticket.currency || 'INR',
      receipt: `t_${Date.now().toString(36)}`,
      notes: { event_id: event.id, ticket_type_id: ticket.id, email },
    });

    const { error } = await db.from('ticket_payments').insert({
      event_id: event.id,
      ticket_type_id: ticket.id,
      email,
      amount: ticket.price_amount,
      currency: ticket.currency || 'INR',
      razorpay_order_id: order.id,
      // Lets the webhook finish the registration if the buyer closes the page after paying.
      checkout_payload: { ...ticketCheckoutPayload(body.checkout), email },
    });
    if (error) {
      console.error('[razorpay] could not record order', { code: error.code });
      return NextResponse.json({ error: 'Payments are not ready yet. Please try again later.' }, { status: 503 });
    }

    return NextResponse.json({
      keyId: keys.keyId,
      orderId: order.id,
      amount: ticket.price_amount,
      currency: ticket.currency || 'INR',
      eventName: event.name,
      ticketName: ticket.name,
    });
  } catch (err) {
    console.error('[razorpay] order failed', { message: (err as { error?: { description?: string } })?.error?.description });
    return NextResponse.json({ error: 'The payment could not be started. Please try again.' }, { status: 502 });
  }
}
