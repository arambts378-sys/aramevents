"use client";

import React, { useState } from 'react';
import { submitSponsorRequestAction } from '@/app/actions/sponsorRequestActions';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { formatPaiseToINR } from '@/services/ticketService';
import type { PublicSponsorPackage, SponsorKind } from '@/lib/events/sponsors';
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

export default function SponsorRequestForm({
  eventId,
  kind,
  packages,
}: {
  eventId: string;
  kind: SponsorKind;
  packages: PublicSponsorPackage[];
}) {
  const [form, setForm] = useState<SponsorRequestValues>({
    package_id: packages.length === 1 ? packages[0].id : '',
    organization: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    message: '',
  });
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ packageName: string; amount: number } | null>(null);

  const field = (name: keyof SponsorRequestValues) => ({
    id: `request-${name}`,
    name,
    value: form[name],
    'aria-invalid': Boolean(errors[name]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors(withoutFieldError(errors, name));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSponsorRequest(form);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSponsorRequestAction(eventId, form, trap);
      if (result.ok) {
        setSent({ packageName: result.packageName, amount: result.amount });
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.message ?? null);
      if (result.fieldErrors) focusFirstError();
    } catch {
      setFormError('We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="p-6 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-center">
        <span className="material-symbols-outlined text-5xl text-green-600" aria-hidden="true">check_circle</span>
        <h2 className="text-title-lg font-bold text-on-surface mt-2">Request sent</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          Thank you. Your request for {sent.packageName} ({priceLabel(sent.amount)}) has been sent to the organizer.
        </p>
        {sent.amount > 0 && (
          <p className="text-body-sm text-on-surface-variant mt-3">
            Nothing has been charged. The organizer will contact you with payment details.
          </p>
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
        <legend className={`${LABEL} mb-2`}>Choose a package *</legend>
        {packages.map((pkg) => {
          const selected = form.package_id === pkg.id;
          return (
            <label
              key={pkg.id}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                selected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="package_id"
                value={pkg.id}
                checked={selected}
                onChange={() => {
                  setForm({ ...form, package_id: pkg.id });
                  setErrors(withoutFieldError(errors, 'package_id'));
                }}
                className="mt-1 w-4 h-4"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-on-surface">{pkg.name}</span>
                  <span className="font-bold text-on-surface whitespace-nowrap">{priceLabel(pkg.amount)}</span>
                </span>
                {pkg.description && <span className="block text-body-sm text-on-surface-variant mt-0.5">{pkg.description}</span>}
              </span>
            </label>
          );
        })}
        <FieldError message={errors.package_id} />
      </fieldset>

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
        <label htmlFor="request-website_url" className={LABEL}>Website (Optional)</label>
        <input type="url" placeholder="https://" className={INPUT} {...field('website_url')} />
        <FieldError message={errors.website_url} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-message" className={LABEL}>Message (Optional)</label>
        <textarea rows={3} className={`${INPUT} resize-y`} {...field('message')} />
        <FieldError message={errors.message} />
      </div>

      <p className="text-body-sm text-on-surface-variant">
        You won&apos;t be charged now. The organizer will review your request and contact you with payment details.
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {submitting ? 'Sending...' : `Send ${kind === 'sponsor' ? 'Sponsorship' : 'Partnership'} Request`}
      </button>
    </form>
  );
}
