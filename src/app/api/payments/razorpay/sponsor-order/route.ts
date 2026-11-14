import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { razorpayClient, razorpayKeys } from '@/lib/payments/razorpay';
import { checkSponsorRequest } from '@/lib/events/sponsorRequests.server';
import { CUSTOM_PACKAGE_ID } from '@/lib/events/sponsors';
import { sponsorCheckoutPayload } from '@/lib/payments/checkoutPayload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a Razorpay order for a sponsor or partner payment: a package (amount from the database)
 * or a custom amount (checked against the organizer's minimum). Public: sponsors are not signed in.
 */
export async function POST(request: Request) {
  const keys = razorpayKeys();
  const razorpay = razorpayClient();
  if (!keys || !razorpay) {
    return NextResponse.json({ error: 'Online payment is not set up for this site yet.' }, { status: 503 });
  }

  let body: { eventId?: string; kind?: string; packageId?: string; customAmount?: number; email?: string; checkout?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const kind = body.kind === 'partner' ? 'partner' : 'sponsor';
  const packageId = body.packageId ?? '';
  if (!UUID.test(body.eventId ?? '') || !(UUID.test(packageId) || packageId === CUSTOM_PACKAGE_ID) || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'Choose a package and enter a valid email first.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: event } = await db.from('events').select('id, name, status').eq('id', body.eventId!).maybeSingle();
  if (!event || event.status !== 'published') {
    return NextResponse.json({ error: 'This event is not accepting sponsors right now.' }, { status: 404 });
  }

  // Same checks as the request itself, so nobody pays for a request that would be refused.
  const check = await checkSponsorRequest(db, {
    eventId: event.id,
    kind,
    packageId,
    customAmount: Number(body.customAmount) || 0,
    email,
  });
  if (!check.ok) return NextResponse.json({ error: check.message, reason: check.reason }, { status: 409 });
  const choice = check.choice;
  if (!(choice.amount > 0)) {
    return NextResponse.json({ error: 'There is no fee for this, so no payment is needed.' }, { status: 400 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: choice.amount, // paise
      currency: 'INR',
      receipt: `s_${Date.now().toString(36)}`,
      notes: { event_id: event.id, kind: choice.kind, sponsor_package_id: choice.packageId ?? 'custom', email },
    });

    const { error } = await db.from('sponsor_payments').insert({
      event_id: event.id,
      package_id: choice.packageId,
      kind: choice.kind,
      email,
      amount: choice.amount, // incl. 18% GST
      base_amount: choice.base,
      gst_amount: choice.gst,
      // Lets the webhook finish the request if the sponsor closes the page after paying.
      checkout_payload: { ...sponsorCheckoutPayload(body.checkout), package_id: packageId, contact_email: email, kind },
      currency: 'INR',
      razorpay_order_id: order.id,
    });
    if (error) {
      console.error('[razorpay] could not record sponsor order', { code: error.code });
      return NextResponse.json({ error: 'Payments are not ready yet. Please try again later.' }, { status: 503 });
    }

    return NextResponse.json({
      keyId: keys.keyId,
      orderId: order.id,
      amount: choice.amount,
      currency: 'INR',
      description: `${choice.kind === 'partner' ? 'Partner' : 'Sponsor'}: ${choice.name} (incl. 18% GST)`,
    });
  } catch (err) {
    console.error('[razorpay] sponsor order failed', { message: (err as { error?: { description?: string } })?.error?.description });
    return NextResponse.json({ error: 'The payment could not be started. Please try again.' }, { status: 502 });
  }
}
