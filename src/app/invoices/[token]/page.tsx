import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { paymentMethodLabel } from '@/lib/payments/invoices.server';
import { formatPaiseToINR } from '@/services/ticketService';
import PrintButton from './PrintButton';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

const SOURCE_LABEL = { ticket: 'Event ticket', sponsor: 'Sponsorship', partner: 'Partnership' } as const;

/** A paid invoice, opened with the private link the payer got after paying. */
export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();

  const db = createAdminClient();
  const { data: invoice } = await db.from('payment_invoices').select('*').eq('access_token', token).maybeSingle();
  if (!invoice) notFound();

  const { data: event } = await db
    .from('events')
    .select('name, start_date, location, workspace_id')
    .eq('id', invoice.event_id)
    .maybeSingle();
  const { data: workspace } = event?.workspace_id
    ? await db.from('workspaces').select('name, email').eq('id', event.workspace_id).maybeSingle()
    : { data: null };

  const issued = new Date(invoice.issued_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const eventDate = event?.start_date
    ? new Date(`${event.start_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const total = Number(invoice.amount);
  const cgst = Number(invoice.cgst_amount ?? 0);
  const sgst = Number(invoice.sgst_amount ?? 0);
  const igst = Number(invoice.igst_amount ?? 0);
  const taxTotal = cgst + sgst + igst;
  const hasGst = taxTotal > 0;
  const rate = Number(invoice.gst_rate ?? 0);
  const subtotal = hasGst ? Number(invoice.subtotal ?? total - taxTotal) : total;
  const amount = formatPaiseToINR(total);
  const lineAmount = formatPaiseToINR(subtotal);
  const unit = formatPaiseToINR(Math.round(subtotal / (invoice.quantity || 1)));
  const sellerName = invoice.seller_legal_name || workspace?.name || event?.name || 'Event organizer';
  const title = invoice.seller_gstin ? 'Tax invoice' : 'Invoice';
  const source = SOURCE_LABEL[invoice.source as keyof typeof SOURCE_LABEL] ?? 'Payment';

  return (
    <div className="min-h-screen bg-[#F4F3F7] py-8 px-4 print:bg-white print:p-0 text-[#17152B]">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="mx-auto max-w-3xl mb-4 flex items-center justify-between gap-3 print:hidden">
        <p className="text-[13px] text-[#5B5870]">Keep this link private: anyone with it can see this invoice.</p>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl bg-white rounded-2xl border border-[#E4E2EC] shadow-sm p-6 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-8 border-b border-[#E4E2EC]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7A1F3D]">{title}</p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight">{sellerName}</h1>
            {invoice.seller_address && <p className="mt-1 text-[14px] text-[#5B5870] whitespace-pre-line max-w-xs">{invoice.seller_address}</p>}
            {invoice.seller_gstin && <p className="mt-1 text-[14px]">GSTIN: <span className="font-mono font-semibold">{invoice.seller_gstin}</span></p>}
            {workspace?.email && <p className="mt-1 text-[14px] text-[#5B5870]">{workspace.email}</p>}
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-[14px] sm:text-right">
            <dt className="text-[#5B5870]">Invoice no.</dt>
            <dd className="font-semibold font-mono">{invoice.invoice_number}</dd>
            <dt className="text-[#5B5870]">Date</dt>
            <dd className="font-semibold">{issued}</dd>
            <dt className="text-[#5B5870]">Status</dt>
            <dd className="font-semibold text-green-700">Paid</dd>
          </dl>
        </header>

        <section className="grid sm:grid-cols-2 gap-8 py-8 border-b border-[#E4E2EC]">
          <div>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5B5870]">Billed to</h2>
            <div className="mt-2 text-[15px] leading-relaxed">
              {invoice.buyer_organization && <p className="font-semibold">{invoice.buyer_organization}</p>}
              {invoice.buyer_name && <p className={invoice.buyer_organization ? '' : 'font-semibold'}>{invoice.buyer_name}</p>}
              <p className="text-[#5B5870]">{invoice.buyer_email}</p>
              {invoice.buyer_phone && <p className="text-[#5B5870]">{invoice.buyer_phone}</p>}
              {invoice.buyer_gstin && <p>GSTIN: <span className="font-mono font-semibold">{invoice.buyer_gstin}</span></p>}
            </div>
          </div>
          <div>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5B5870]">Event</h2>
            <div className="mt-2 text-[15px] leading-relaxed">
              <p className="font-semibold">{event?.name}</p>
              {eventDate && <p className="text-[#5B5870]">{eventDate}</p>}
              {event?.location && <p className="text-[#5B5870]">{event.location}</p>}
            </div>
          </div>
        </section>

        <section className="py-8 border-b border-[#E4E2EC]">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.08em] text-[#5B5870]">
                <th className="pb-3 font-semibold">Description</th>
                <th className="pb-3 font-semibold text-right w-16">Qty</th>
                <th className="pb-3 font-semibold text-right w-32">Price</th>
                <th className="pb-3 font-semibold text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E4E2EC] align-top">
                <td className="py-4 pr-4">
                  <p className="font-semibold">{invoice.description}</p>
                  <p className="text-[13px] text-[#5B5870] mt-0.5">
                    {source}
                    {hasGst && invoice.source !== 'ticket' && ' · SAC 998397 (sponsorship services)'}
                  </p>
                </td>
                <td className="py-4 text-right">{invoice.quantity}</td>
                <td className="py-4 text-right">{unit}</td>
                <td className="py-4 text-right font-semibold">{lineAmount}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full sm:w-72 space-y-2 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[#5B5870]">{hasGst ? 'Taxable value' : 'Subtotal'}</span>
              <span>{lineAmount}</span>
            </div>
            {cgst > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5B5870]">CGST @ {rate / 2}%</span>
                <span>{formatPaiseToINR(cgst)}</span>
              </div>
            )}
            {sgst > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5B5870]">SGST @ {rate / 2}%</span>
                <span>{formatPaiseToINR(sgst)}</span>
              </div>
            )}
            {igst > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5B5870]">IGST @ {rate}%</span>
                <span>{formatPaiseToINR(igst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#17152B] pt-2 text-[16px] font-bold">
              <span>Total paid ({invoice.currency})</span>
              <span>{amount}</span>
            </div>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5B5870]">Payment</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[14px]">
            <dt className="text-[#5B5870]">Method</dt>
            <dd>{paymentMethodLabel(invoice.payment_method, invoice.payment_method_detail)}, via Razorpay</dd>
            {invoice.razorpay_payment_id && (
              <>
                <dt className="text-[#5B5870]">Payment ID</dt>
                <dd className="font-mono">{invoice.razorpay_payment_id}</dd>
              </>
            )}
            <dt className="text-[#5B5870]">Order ID</dt>
            <dd className="font-mono">{invoice.razorpay_order_id}</dd>
          </dl>
          <p className="mt-6 text-[12px] text-[#5B5870]">
            {hasGst
              ? `GST charged at ${rate}% on the taxable value${igst > 0 ? ' (inter-state supply: IGST)' : ' (CGST + SGST)'}.`
              : 'Amounts are inclusive of any applicable taxes.'}{' '}
            This invoice was generated electronically and needs no signature.
          </p>
        </section>
      </article>
    </div>
  );
}
