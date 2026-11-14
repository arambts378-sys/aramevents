import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { FieldErrors, SponsorRequestValues, hasErrors, validateSponsorRequest } from '@/lib/validation/forms';
import { checkSponsorRequest } from '@/lib/events/sponsorRequests.server';
import { CUSTOM_PACKAGE_ID, type SponsorKind } from '@/lib/events/sponsors';
import { razorpayStatus, refundUnusedSponsorPayment, type RefundOutcome } from '@/lib/payments/razorpay';
import { issueInvoice } from '@/lib/payments/invoices.server';

export type SponsorRequestResult =
  | { ok: true; packageName: string; amount: number; paid: boolean; invoiceUrl?: string | null }
  | { ok: false; message?: string; fieldErrors?: FieldErrors; payment?: RefundOutcome };
type RequestResult = SponsorRequestResult;

/**
 * The request a paid order already created, when the same order is finished twice: by the
 * browser and by the Razorpay webhook. Only the payer has the order ID, and the email must match.
 */
async function requestForOrder(orderId: string, email: string): Promise<RequestResult | null> {
  const db = createAdminClient();
  const { data: payment } = await db
    .from('sponsor_payments')
    .select('status, email, amount, sponsor_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!payment || payment.status !== 'used' || !payment.sponsor_id) return null;
  if (payment.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  const [{ data: sponsor }, { data: invoice }] = await Promise.all([
    db.from('event_sponsors').select('tier').eq('id', payment.sponsor_id).maybeSingle(),
    db.from('payment_invoices').select('access_token').eq('razorpay_order_id', orderId).maybeSingle(),
  ]);
  return {
    ok: true,
    packageName: sponsor?.tier ?? 'Sponsorship',
    amount: Number(payment.amount),
    paid: true,
    invoiceUrl: invoice ? `/invoices/${invoice.access_token}` : null,
  };
}

/**
 * A public sponsor or partner request, for a package or a custom amount. The price always comes
 * from the package in the database or the organizer's rules for custom amounts, never from a
 * price the browser sends. `trap` is a hidden field only bots fill in.
 *
 * When there is something to pay and Razorpay is set up, `paymentOrderId` must be a verified,
 * unused payment for this event, choice, email and amount. If the request cannot be saved after
 * that, the payment is refunded. Without Razorpay the request is sent unpaid and the organizer
 * collects the money themselves.
 */
export async function completeSponsorRequest(
  eventId: string,
  kind: SponsorKind,
  form: SponsorRequestValues,
  trap: string,
  paymentOrderId?: string,
): Promise<RequestResult> {
  // Already finished for this paid order (by the webhook or an earlier attempt): same answer again.
  if (paymentOrderId) {
    const done = await requestForOrder(paymentOrderId, form.contact_email);
    if (done) return done;
  }
  // A failure after paying refunds, unless the other finisher of this order just booked it.
  const fail = async (failure: Extract<RequestResult, { ok: false }>): Promise<RequestResult> => {
    if (!paymentOrderId) return failure;
    for (let attempt = 0; attempt < 4; attempt++) {
      const raced = await requestForOrder(paymentOrderId, form.contact_email);
      if (raced) return raced;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 750));
    }
    return refundWith(paymentOrderId, failure);
  };

  const fieldErrors = validateSponsorRequest(form);
  if (hasErrors(fieldErrors)) return fail({ ok: false, fieldErrors });

  const email = form.contact_email.trim().toLowerCase();
  const buyerGstin = form.gstin?.trim().toUpperCase() || null;
  const customAmount = form.package_id === CUSTOM_PACKAGE_ID ? Math.round(Number(form.custom_amount || 0) * 100) : 0;
  try {
    const supabase = createAdminClient();

    const check = await checkSponsorRequest(supabase, {
      eventId,
      kind: kind === 'partner' ? 'partner' : 'sponsor',
      packageId: form.package_id,
      customAmount,
      email,
    });
    if (!check.ok) {
      return fail(
        check.reason === 'package'
          ? { ok: false, fieldErrors: { package_id: check.message } }
          : check.reason === 'amount'
            ? { ok: false, fieldErrors: { custom_amount: check.message } }
            : check.reason === 'pending'
              ? { ok: false, fieldErrors: { contact_email: check.message } }
              : { ok: false, message: check.message },
      );
    }
    const choice = check.choice;

    // Looks like success to a bot, so it learns nothing, but saves nothing.
    if (trap) return { ok: true, packageName: choice.name, amount: choice.amount, paid: false };

    // Something to pay and online payment available: claim the verified payment (once).
    let paymentRowId: string | null = null;
    if (choice.amount > 0 && (await razorpayStatus()).ready) {
      if (!paymentOrderId) return { ok: false, message: 'Please complete the payment to send your request.' };
      let claim = supabase
        .from('sponsor_payments')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('razorpay_order_id', paymentOrderId)
        .eq('event_id', eventId)
        .eq('email', email)
        .eq('amount', choice.amount)
        .eq('status', 'paid');
      claim = choice.packageId ? claim.eq('package_id', choice.packageId) : claim.is('package_id', null).eq('kind', choice.kind);
      const { data: claimed } = await claim.select('id').maybeSingle();
      // Not claimable: the other finisher of this order may be mid-way (fail() waits for it), or it is not this order.
      if (!claimed) return fail({ ok: false, message: 'We could not match your payment to this request.' });
      paymentRowId = claimed.id;
    }

    const { data: sponsor, error } = await supabase
      .from('event_sponsors')
      .insert({
        event_id: eventId,
        kind: choice.kind,
        name: form.organization.trim(),
        tier: choice.name,
        package_id: choice.packageId,
        // Sponsorship value before tax; the GST paid on top is on the invoice.
        amount_agreed: choice.base,
        amount_received: paymentRowId ? choice.base : 0,
        gstin: buyerGstin,
        contact_name: form.contact_name.trim(),
        contact_email: email,
        contact_phone: form.contact_phone.trim(),
        website_url: form.website_url.trim() || null,
        notes: form.message.trim() || null,
        request_status: 'pending',
        show_on_website: false,
      })
      .select('id')
      .single();

    if (error || !sponsor) {
      if (paymentRowId && paymentOrderId) {
        // Put the payment back so it can be refunded, then refund it.
        await supabase.from('sponsor_payments').update({ status: 'paid', used_at: null }).eq('id', paymentRowId);
        return refundWith(paymentOrderId, { ok: false, message: 'We could not save your request.' });
      }
      throw error;
    }

    let invoiceUrl: string | null = null;
    if (paymentRowId && paymentOrderId) {
      await supabase.from('sponsor_payments').update({ sponsor_id: sponsor.id, checkout_payload: null }).eq('id', paymentRowId);
      const { data: ev } = await supabase.from('events').select('name').eq('id', eventId).maybeSingle();
      invoiceUrl = await issueInvoice({
        source: choice.kind,
        orderId: paymentOrderId,
        description: `${choice.kind === 'partner' ? 'Partnership' : 'Sponsorship'}: ${choice.name} — ${ev?.name ?? 'Event'}`,
        buyer: { name: form.contact_name, email, phone: form.contact_phone, organization: form.organization, gstin: buyerGstin },
        sponsorId: sponsor.id,
        gst: { subtotal: choice.base, amount: choice.gst, rate: 18 },
      });
    }

    return { ok: true, packageName: choice.name, amount: choice.amount, paid: Boolean(paymentRowId), invoiceUrl };
  } catch (err) {
    console.error('Sponsor request failed:', err);
    return fail({ ok: false, message: 'We could not send your request. Please try again.' });
  }
}

/** The request failed after the sponsor paid: give the money back and say what happened to it. */
async function refundWith(orderId: string, failure: Extract<RequestResult, { ok: false }>): Promise<RequestResult> {
  const payment = await refundUnusedSponsorPayment(orderId, failure.message || 'Sponsor request could not be saved');
  return { ...failure, payment };
}
