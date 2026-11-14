"use client";

import React, { useState } from 'react';
import { submitSponsorRequestAction } from '@/app/actions/sponsorRequestActions';
import { payWithRazorpay } from '@/lib/payments/checkout';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { formatPaiseToINR } from '@/services/ticketService';
import {
  CUSTOM_PACKAGE_ID,
  DEFAULT_SPONSOR_OPTIONS,
  SPONSOR_GST_RATE,
  customPackageName,
  withSponsorGst,
  type PublicSponsorPackage,
  type SponsorKind,
  type SponsorOptions,
} from '@/lib/events/sponsors';
import {
  FieldErrors,
  SponsorRequestValues,
  hasErrors,
  validateSponsorRequest,
  withoutFieldError,
} from '@/lib/validation/forms';

const INPUT =
  'w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary';
const LABEL = 'text-label-sm font-bold text-on-surface-variant';

const priceLabel = (amount: number) => (amount > 0 ? formatPaiseToINR(amount) : 'No payment');
const rupees = (paise: number) => (paise / 100).toLocaleString('en-IN');

export default function SponsorRequestForm({
  eventId,
  eventName,
  kind,
  packages,
  options = DEFAULT_SPONSOR_OPTIONS,
  paymentsEnabled = false,
  color,
}: {
  eventId: string;
  eventName?: string;
  kind: SponsorKind;
  packages: PublicSponsorPackage[];
  /** The organizer's rules for custom amounts and partner requests */
  options?: SponsorOptions;
  /** Razorpay is set up, so amounts are paid online before the request is sent */
  paymentsEnabled?: boolean;
  color?: string;
}) {
  const allowCustom = kind === 'sponsor' ? options.acceptCustomSponsorship : options.acceptPartnerRequests;
  const choices = packages.length + (allowCustom ? 1 : 0);
  const [form, setForm] = useState<SponsorRequestValues>({
    package_id: choices === 1 ? (packages[0]?.id ?? CUSTOM_PACKAGE_ID) : '',
    organization: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    message: '',
    custom_amount: '',
    gstin: '',
  });
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ packageName: string; amount: number; paid: boolean; invoiceUrl?: string | null; emailed?: boolean } | null>(null);

  const isCustom = form.package_id === CUSTOM_PACKAGE_ID;
  const selected = packages.find((p) => p.id === form.package_id);
  const customPaise = Math.round(Number(form.custom_amount || 0) * 100) || 0;
  // Amounts on the form are before tax; 18% GST is added on top.
  const base = isCustom ? customPaise : selected?.amount ?? 0;
  const tax = withSponsorGst(base);
  const amount = tax.total;
  const payNow = paymentsEnabled && amount > 0;
  const label = kind === 'sponsor' ? 'Sponsorship' : 'Partnership';
  const customRules = { required: kind === 'sponsor', minPaise: options.customSponsorshipMin };

  const field = (name: keyof SponsorRequestValues) => ({
    id: `request-${name}`,
    name,
    value: form[name] ?? '',
    'aria-invalid': Boolean(errors[name]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors(withoutFieldError(errors, name));
    },
  });

  const choose = (id: string) => {
    setForm({ ...form, package_id: id });
    setErrors(withoutFieldError(withoutFieldError(errors, 'package_id'), 'custom_amount'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSponsorRequest(form, customRules);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSubmitting(true);

    // Something to pay: take the payment first; the request then uses the verified order.
    let paidOrderId: string | undefined;
    if (payNow && !trap) {
      try {
        paidOrderId = await payWithRazorpay({
          orderUrl: '/api/payments/razorpay/sponsor-order',
          orderBody: {
            eventId,
            kind,
            packageId: form.package_id,
            customAmount: isCustom ? customPaise : undefined,
            email: form.contact_email.trim(),
            checkout: form,
          },
          title: eventName || label,
          name: form.contact_name.trim(),
          email: form.contact_email.trim(),
          phone: form.contact_phone.trim(),
          color,
          cancelledMessage: 'Payment cancelled. Your request has not been sent yet.',
        });
      } catch (err) {
        setFormError((err as Error).message);
        setSubmitting(false);
        return;
      }
    }

    try {
      const result = await submitSponsorRequestAction(eventId, kind, form, trap, paidOrderId);
      if (result.ok) {
        setSent({ packageName: result.packageName, amount: result.amount, paid: result.paid, invoiceUrl: result.invoiceUrl, emailed: result.emailed });
        return;
      }
      setErrors(result.fieldErrors ?? {});
      const refund =
        result.payment === 'refunded'
          ? ' Your payment has been refunded in full. It usually reaches your account in 5–7 working days.'
          : result.payment === 'released'
            ? ' You have not been charged: your bank will release the held amount automatically.'
            : paidOrderId
              ? ` Your payment went through. Contact the organizer with order ID ${paidOrderId} for a refund.`
              : '';
      const message = result.message ?? (paidOrderId ? 'Your request could not be sent.' : null);
      setFormError(message ? message + refund : null);
      if (result.fieldErrors) focusFirstError();
    } catch {
      setFormError(paidOrderId
        ? `Your payment went through, but we could not confirm your request. Contact the organizer with order ID ${paidOrderId}.`
        : 'We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="p-6 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-center">
        <span className="material-symbols-outlined text-5xl text-green-600" aria-hidden="true">check_circle</span>
        <h2 className="text-title-lg font-bold text-on-surface mt-2">{sent.paid ? 'Payment received' : 'Request sent'}</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          {sent.paid ? (
            <>Thank you. We received {priceLabel(sent.amount)} (incl. GST) for {sent.packageName}. The organizer will be in touch to confirm the details.</>
          ) : (
            <>Thank you. Your request for {sent.packageName} ({priceLabel(sent.amount)}{sent.amount > 0 ? ' incl. GST' : ''}) has been sent to the organizer.</>
          )}
        </p>
        {sent.emailed && (
          <p className="text-body-sm text-on-surface-variant mt-3">
            We&apos;ve emailed a confirmation{sent.invoiceUrl ? ' and your invoice' : ''} to <strong className="text-on-surface">{form.contact_email}</strong>.
          </p>
        )}
        {sent.amount > 0 && !sent.paid && (
          <p className="text-body-sm text-on-surface-variant mt-3">
            Nothing has been charged. The organizer will contact you with payment details.
          </p>
        )}
        {sent.invoiceUrl && (
          <a
            href={sent.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">receipt_long</span>
            View and download invoice
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <div role="alert" className="p-4 bg-error-container text-on-error-container rounded-xl text-body-sm">
          {formError}
        </div>
      )}

      {/* Hidden from people; bots tend to fill it in */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>{packages.length ? 'Choose a package *' : `Your ${label.toLowerCase()} *`}</legend>
        {packages.map((pkg) => {
          const isSelected = form.package_id === pkg.id;
          return (
            <label
              key={pkg.id}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'
              }`}
            >
              <input type="radio" name="package_id" value={pkg.id} checked={isSelected} onChange={() => choose(pkg.id)} className="mt-1 w-4 h-4" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-on-surface">{pkg.name}</span>
                  <span className="font-bold text-on-surface whitespace-nowrap">
                    {priceLabel(pkg.amount)}
                    {pkg.amount > 0 && <span className="font-normal text-on-surface-variant text-body-sm"> + GST</span>}
                  </span>
                </span>
                {pkg.description && <span className="block text-body-sm text-on-surface-variant mt-0.5">{pkg.description}</span>}
              </span>
            </label>
          );
        })}

        {allowCustom && (
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              isCustom ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'
            }`}
          >
            <input type="radio" name="package_id" value={CUSTOM_PACKAGE_ID} checked={isCustom} onChange={() => choose(CUSTOM_PACKAGE_ID)} className="mt-1 w-4 h-4" />
            <span className="min-w-0 flex-1">
              <span className="font-bold text-on-surface">
                {kind === 'sponsor' ? 'Choose your own amount' : packages.length ? 'Other partnership' : customPackageName(kind)}
              </span>
              <span className="block text-body-sm text-on-surface-variant mt-0.5">
                {kind === 'sponsor'
                  ? `Contribute any amount from ₹${rupees(options.customSponsorshipMin)}.`
                  : 'Tell the organizer how you would like to partner. Add an amount only if you want to contribute money now.'}
              </span>
            </span>
          </label>
        )}
        <FieldError message={errors.package_id} />
      </fieldset>

      {isCustom && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-custom_amount" className={LABEL}>
            Amount in ₹ {kind === 'sponsor' ? '*' : '(Optional)'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold" aria-hidden="true">₹</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={kind === 'sponsor' ? rupees(Math.max(options.customSponsorshipMin, 2500000)) : 'Leave empty for no payment'}
              className={`${INPUT} pl-9`}
              {...field('custom_amount')}
            />
          </div>
          {kind === 'sponsor' && (
            <p className="text-body-sm text-on-surface-variant">Minimum ₹{rupees(options.customSponsorshipMin)}, before {SPONSOR_GST_RATE}% GST.</p>
          )}
          <FieldError message={errors.custom_amount} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-organization" className={LABEL}>Organization name *</label>
        <input type="text" className={INPUT} {...field('organization')} />
        <FieldError message={errors.organization} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-contact_name" className={LABEL}>Your name *</label>
        <input type="text" autoComplete="name" className={INPUT} {...field('contact_name')} />
        <FieldError message={errors.contact_name} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-contact_email" className={LABEL}>Email *</label>
          <input type="email" autoComplete="email" className={INPUT} {...field('contact_email')} />
          <FieldError message={errors.contact_email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-contact_phone" className={LABEL}>Phone *</label>
          <input type="tel" autoComplete="tel" className={INPUT} {...field('contact_phone')} />
          <FieldError message={errors.contact_phone} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-gstin" className={LABEL}>GSTIN (Optional)</label>
        <input
          type="text"
          autoComplete="off"
          maxLength={15}
          placeholder="33ABCDE1234F1Z5"
          className={`${INPUT} uppercase`}
          {...field('gstin')}
        />
        <p className="text-body-sm text-on-surface-variant">Add your company&apos;s GSTIN to claim input tax credit on the invoice.</p>
        <FieldError message={errors.gstin} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-website_url" className={LABEL}>Website (Optional)</label>
        <input type="url" placeholder="https://" className={INPUT} {...field('website_url')} />
        <FieldError message={errors.website_url} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-message" className={LABEL}>Message (Optional)</label>
        <textarea rows={3} className={`${INPUT} resize-y`} {...field('message')} />
        <FieldError message={errors.message} />
      </div>

      {base > 0 && (
        <dl className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 text-body-sm space-y-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">{isCustom ? 'Your amount' : selected?.name}</dt>
            <dd className="text-on-surface">{formatPaiseToINR(tax.base)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">GST ({SPONSOR_GST_RATE}%)</dt>
            <dd className="text-on-surface">{formatPaiseToINR(tax.gst)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-outline-variant/60 pt-1.5 font-bold text-on-surface">
            <dt>Total</dt>
            <dd>{formatPaiseToINR(tax.total)}</dd>
          </div>
        </dl>
      )}

      <p className="text-body-sm text-on-surface-variant">
        {payNow
          ? 'You will pay securely through Razorpay and get a GST invoice. Your request is sent to the organizer once the payment goes through.'
          : amount > 0
            ? "You won't be charged now. The organizer will review your request and contact you with payment details."
            : 'The organizer will review your request and get back to you.'}
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {submitting
          ? payNow ? 'Processing payment...' : 'Sending...'
          : payNow
            ? `Pay ${formatPaiseToINR(amount)} and send request`
            : `Send ${label} Request`}
      </button>
    </form>
  );
}
