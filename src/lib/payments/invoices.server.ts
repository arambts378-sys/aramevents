import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { splitGst } from '@/lib/events/sponsors';

export type InvoiceSource = 'ticket' | 'sponsor' | 'partner';

/**
 * Issues the invoice for a completed online payment, once per Razorpay order (calling it again
 * returns the same invoice). The amount and payment details come from the verified payment row,
 * never from the caller. Returns the invoice's private link, or null if it could not be issued;
 * a missing invoice never undoes the booking it belongs to.
 */
export async function issueInvoice(input: {
  source: InvoiceSource;
  orderId: string;
  description: string;
  buyer: { name?: string | null; email: string; phone?: string | null; organization?: string | null; gstin?: string | null };
  registrationId?: string | null;
  sponsorId?: string | null;
  /** GST charged on top (sponsors/partners): amount before tax, tax, and rate in percent */
  gst?: { subtotal: number; amount: number; rate: number };
}): Promise<string | null> {
  try {
    const db = createAdminClient();
    const table = input.source === 'ticket' ? 'ticket_payments' : 'sponsor_payments';
    const { data: payment } = await db
      .from(table)
      .select('event_id, amount, currency, status, razorpay_payment_id, payment_method, payment_method_detail')
      .eq('razorpay_order_id', input.orderId)
      .maybeSingle();
    if (!payment || payment.status !== 'used') return null;

    const { data: existing } = await db
      .from('payment_invoices')
      .select('access_token')
      .eq('razorpay_order_id', input.orderId)
      .maybeSingle();
    if (existing) return `/invoices/${existing.access_token}`;

    // Organizer's GST details at the time of the sale, kept on the invoice.
    const { data: seller } = await db
      .from('event_registration_settings')
      .select('seller_legal_name, seller_gstin, seller_address')
      .eq('event_id', payment.event_id)
      .maybeSingle();
    const buyerGstin = input.buyer.gstin?.trim().toUpperCase() || null;
    // The tax always comes out of what was actually paid, so the invoice adds up.
    const gstAmount = input.gst ? Math.min(input.gst.amount, Number(payment.amount)) : 0;
    const split = splitGst(gstAmount, seller?.seller_gstin, buyerGstin);

    const { data: created, error } = await db
      .from('payment_invoices')
      .insert({
        event_id: payment.event_id,
        source: input.source,
        razorpay_order_id: input.orderId,
        razorpay_payment_id: payment.razorpay_payment_id,
        payment_method: payment.payment_method,
        payment_method_detail: payment.payment_method_detail,
        buyer_name: input.buyer.name?.trim() || null,
        buyer_email: input.buyer.email.trim().toLowerCase(),
        buyer_phone: input.buyer.phone?.trim() || null,
        buyer_organization: input.buyer.organization?.trim() || null,
        description: input.description,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        registration_id: input.registrationId ?? null,
        sponsor_id: input.sponsorId ?? null,
        subtotal: Number(payment.amount) - gstAmount,
        gst_rate: input.gst ? input.gst.rate : 0,
        cgst_amount: split.cgst,
        sgst_amount: split.sgst,
        igst_amount: split.igst,
        seller_legal_name: seller?.seller_legal_name ?? null,
        seller_gstin: seller?.seller_gstin ?? null,
        seller_address: seller?.seller_address ?? null,
        buyer_gstin: buyerGstin,
      })
      .select('access_token')
      .single();

    if (error) {
      // Two requests raced: the other one issued it.
      const { data: again } = await db
        .from('payment_invoices')
        .select('access_token')
        .eq('razorpay_order_id', input.orderId)
        .maybeSingle();
      if (again) return `/invoices/${again.access_token}`;
      console.error('[invoices] could not issue invoice', { code: error.code });
      return null;
    }
    return `/invoices/${created.access_token}`;
  } catch (err) {
    console.error('[invoices] could not issue invoice', err);
    return null;
  }
}

/** Human labels for Razorpay's payment methods. */
export function paymentMethodLabel(method: string | null | undefined, detail?: string | null) {
  const names: Record<string, string> = {
    upi: 'UPI',
    card: 'Card',
    netbanking: 'Net banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay later',
    cardless_emi: 'Cardless EMI',
    bank_transfer: 'Bank transfer',
  };
  const name = method ? names[method] ?? method.replace(/_/g, ' ') : 'Online payment';
  return detail ? `${name} (${detail})` : name;
}
