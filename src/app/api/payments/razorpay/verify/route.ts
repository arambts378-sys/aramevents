import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidPaymentSignature, paymentMethodOf, razorpayClient, razorpayKeys } from '@/lib/payments/razorpay';

/**
 * Called after Razorpay Checkout succeeds. Checks the signature, confirms with Razorpay that the
 * payment belongs to this order and was paid in full, then marks the order paid so the
 * registration can use it (once).
 */
export async function POST(request: Request) {
  const keys = razorpayKeys();
  const razorpay = razorpayClient();
  if (!keys || !razorpay) return NextResponse.json({ error: 'Online payment is not set up.' }, { status: 503 });

  let body: { orderId?: string; paymentId?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { orderId, paymentId, signature } = body;
  if (!orderId || !paymentId || !signature || !isValidPaymentSignature(orderId, paymentId, signature, keys.keySecret)) {
    return NextResponse.json({ error: 'The payment could not be verified.' }, { status: 400 });
  }

  const db = createAdminClient();
  // An order is either a ticket or a sponsor/partner package.
  let table: 'ticket_payments' | 'sponsor_payments' = 'ticket_payments';
  let { data: row } = await db.from('ticket_payments').select('id, amount, status').eq('razorpay_order_id', orderId).maybeSingle();
  if (!row) {
    table = 'sponsor_payments';
    ({ data: row } = await db.from('sponsor_payments').select('id, amount, status').eq('razorpay_order_id', orderId).maybeSingle());
  }
  if (!row) return NextResponse.json({ error: 'This payment does not match an order.' }, { status: 404 });
  if (row.status === 'paid' || row.status === 'used') return NextResponse.json({ ok: true });
  if (row.status === 'refunded') {
    return NextResponse.json({ error: 'This payment was refunded because the booking could not be completed.' }, { status: 409 });
  }

  let method: { payment_method: string | null; payment_method_detail: string | null } = { payment_method: null, payment_method_detail: null };
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    const settled = payment.status === 'captured' || payment.status === 'authorized';
    if (payment.order_id !== orderId || Number(payment.amount) !== Number(row.amount) || !settled) {
      await db.from(table).update({ status: 'failed', razorpay_payment_id: paymentId }).eq('id', row.id);
      return NextResponse.json({ error: 'The payment was not completed.' }, { status: 402 });
    }
    method = paymentMethodOf(payment as unknown as Record<string, unknown>);
  } catch (err) {
    console.error('[razorpay] payment fetch failed', { message: (err as { error?: { description?: string } })?.error?.description });
    return NextResponse.json({ error: 'The payment could not be confirmed yet. Please try again.' }, { status: 502 });
  }

  const { error } = await db
    .from(table)
    .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString(), ...method })
    .eq('id', row.id)
    .eq('status', 'created');
  if (error) {
    // Databases without the invoices migration have no payment_method columns: record the payment anyway.
    const retry = await db
      .from(table)
      .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'created');
    if (retry.error) return NextResponse.json({ error: 'The payment could not be recorded.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

