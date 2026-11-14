import 'server-only';
import crypto from 'crypto';
import Razorpay from 'razorpay';

/** Razorpay keys from the environment. The secret never leaves the server. */
export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export function razorpayClient() {
  const keys = razorpayKeys();
  if (!keys) return null;
  return new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });
}

export type PaymentStatus = {
  /** Paid tickets can be bought online right now */
  ready: boolean;
  keys: boolean;
  /** The ticket_payments table from the payments migration exists */
  database: boolean;
  mode: 'test' | 'live' | null;
};

/** Whether online payments work: keys are set and the payments migration has been applied. */
export async function razorpayStatus(): Promise<PaymentStatus> {
  const keys = razorpayKeys();
  const mode = keys ? (keys.keyId.startsWith('rzp_live_') ? 'live' : 'test') : null;
  let database = false;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { error } = await createAdminClient().from('ticket_payments').select('id', { head: true, count: 'exact' }).limit(1);
    database = !error;
  } catch {
    database = false;
  }
  return { ready: Boolean(keys) && database, keys: Boolean(keys), database, mode };
}

export type RefundOutcome = 'refunded' | 'released' | 'not_refunded';

/**
 * Gives the money back for a verified ticket payment whose registration could not be completed
 * (event full, ticket sold out, already registered...). Only touches orders that are 'paid' and not
 * yet used for a registration, so it can never undo a booked ticket.
 * - captured payment: refunded in full
 * - authorized but not captured: Razorpay releases it to the payer automatically, nothing to do
 */
export async function refundUnusedTicketPayment(orderId: string, reason: string): Promise<RefundOutcome> {
  return refundUnusedPayment('ticket_payments', orderId, reason);
}

/** Same as refundUnusedTicketPayment, for a sponsor or partner package payment. */
export async function refundUnusedSponsorPayment(orderId: string, reason: string): Promise<RefundOutcome> {
  return refundUnusedPayment('sponsor_payments', orderId, reason);
}

async function refundUnusedPayment(
  table: 'ticket_payments' | 'sponsor_payments',
  orderId: string,
  reason: string,
): Promise<RefundOutcome> {
  const razorpay = razorpayClient();
  if (!razorpay || !orderId) return 'not_refunded';

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const db = createAdminClient();
  const { data: row } = await db
    .from(table)
    .select('id, status, amount, razorpay_payment_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!row || row.status !== 'paid' || !row.razorpay_payment_id) return 'not_refunded';

  // Claim the refund first, so two finishers of one order (browser and webhook) never refund twice.
  const { data: claimed } = await db
    .from(table)
    .update({ status: 'refunded', refunded_at: new Date().toISOString(), checkout_payload: null })
    .eq('id', row.id)
    .eq('status', 'paid')
    .select('id')
    .maybeSingle();
  if (!claimed) return 'not_refunded';
  const release = () => db.from(table).update({ status: 'paid', refunded_at: null }).eq('id', row.id).eq('status', 'refunded');

  try {
    const payment = await razorpay.payments.fetch(row.razorpay_payment_id);
    if (payment.status === 'authorized') return 'released'; // Razorpay returns uncaptured money by itself
    if (payment.status !== 'captured') {
      await release();
      return 'not_refunded';
    }
    const refund = await razorpay.payments.refund(row.razorpay_payment_id, {
      amount: Number(row.amount),
      notes: { reason: reason.slice(0, 250) },
    });
    await db.from(table).update({ razorpay_refund_id: refund.id }).eq('id', row.id);
    return 'refunded';
  } catch (err) {
    console.error('[razorpay] refund failed', { message: (err as { error?: { description?: string } })?.error?.description });
    await release();
    return 'not_refunded';
  }
}

/** The webhook secret set in the Razorpay dashboard, if configured. */
export function razorpayWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
}

/** Checks a webhook's X-Razorpay-Signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function isValidWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** How the payer paid, for the invoice: "upi" + the UPI handle, "card" + network, bank or wallet. */
export function paymentMethodOf(payment: Record<string, unknown>) {
  const method = typeof payment.method === 'string' ? payment.method : null;
  const card = (payment.card ?? null) as { network?: string; last4?: string } | null;
  const upi = (payment.upi ?? null) as { vpa?: string } | null;
  const vpa = typeof payment.vpa === 'string' ? payment.vpa : upi?.vpa;
  let detail: string | null = null;
  if (method === 'card' && card) detail = [card.network, card.last4 ? `ending ${card.last4}` : null].filter(Boolean).join(' ') || null;
  else if (method === 'upi' && vpa && vpa.includes('@')) detail = `@${vpa.split('@')[1]}`; // handle only, not the full UPI ID
  else if (method === 'netbanking' && typeof payment.bank === 'string') detail = payment.bank;
  else if (method === 'wallet' && typeof payment.wallet === 'string') detail = payment.wallet;
  return { payment_method: method, payment_method_detail: detail };
}

/**
 * Checks the signature Razorpay Checkout returns after a payment:
 * HMAC-SHA256 of "order_id|payment_id" with the key secret.
 */
export function isValidPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
