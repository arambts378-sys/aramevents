"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrationsService } from '@/services/registrations';
import { EventRegistrationSettings } from '@/types';
import Link from 'next/link';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { FieldErrors, hasErrors, validatePublicRegistration, withoutFieldError } from '@/lib/validation/forms';
import { TicketTemplate } from '../ticket/TicketTemplate';
import SponsorRequestForm from './SponsorRequestForm';
import { sponsorKindsOffered, sponsorOptionsFrom, type PublicSponsorPackage, type SponsorKind } from '@/lib/events/sponsors';

import { submitRegistrationServerAction } from '@/app/actions/registrationActions';
import { payWithRazorpay } from '@/lib/payments/checkout';
import { PublicTicketAvailability } from '@/types';
import { formatPaiseToINR } from '@/services/ticketService';
import { isPublicRegistrationEnabled } from '@/lib/security/publicRegistration';
import { cleanLocation } from '@/lib/events/cleanLocation';

interface Props {
  /** The event website's theme as CSS variables; the page uses the app's look when absent */
  themeStyle?: React.CSSProperties;
  /** Razorpay keys are configured, so paid tickets can be bought online */
  paymentsEnabled?: boolean;
  event: any;
  settings: EventRegistrationSettings | null;
  slug: string;
  walkathonDistances?: any[];
  isWalkathon?: boolean;
  tickets?: PublicTicketAvailability[];
  sponsorPackages?: PublicSponsorPackage[];
  initialRole?: 'attendee' | SponsorKind;
  /** A ticket chosen on the event website ("Book" on a ticket), selected when it can be bought */
  initialTicketId?: string;
}

export default function PublicRegistrationClient({ themeStyle, paymentsEnabled = false, event, settings, slug, walkathonDistances = [], isWalkathon = false, tickets = [], sponsorPackages = [], initialRole = 'attendee', initialTicketId }: Props) {
  /** Wraps a screen in the website's theme: colours, fonts and button corners. */
  const themed = (screen: React.ReactNode) => (
    <div
      style={themeStyle}
      className="min-h-screen [&_:is(h1,h2,h3)]:[font-family:var(--website-heading-font,inherit)] [&_button[type=submit]]:rounded-[var(--website-button-radius,0.75rem)]"
    >
      {screen}
    </div>
  );

  const router = useRouter();

  // Offer sponsoring/partnering when there is a package, or the organizer accepts custom requests.
  const sponsorOptions = sponsorOptionsFrom(settings as unknown as Record<string, unknown>);
  const offered = sponsorKindsOffered(sponsorPackages, sponsorOptions);
  const roles = [
    { id: 'attendee' as const, label: 'Attend', icon: 'confirmation_number' },
    ...(['sponsor', 'partner'] as const)
      .filter((kind) => offered[kind])
      .map((kind) => ({ id: kind, label: kind === 'sponsor' ? 'Sponsor' : 'Partner', icon: kind === 'sponsor' ? 'workspace_premium' : 'handshake' })),
  ];
  const [role, setRole] = useState<'attendee' | SponsorKind>(roles.some((r) => r.id === initialRole) ? initialRole : 'attendee');
  
  const isRegistrationOpen = isPublicRegistrationEnabled(settings);
  const [error, setError] = useState<string | null>(isRegistrationOpen ? null : "Registration is currently closed for this event.");
  const [formError, setFormError] = useState<string | null>(null);

  // Selected Ticket State
  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => {
    if (tickets && tickets.length > 0) {
      const chosen = tickets.find(t => t.id === initialTicketId && t.status === 'on_sale');
      if (chosen) return chosen.id;
      const firstAvailable = tickets.find(t => t.status === 'on_sale' && t.ticket_type === 'free')
        || tickets.find(t => t.status === 'on_sale')
        || tickets[0];
      return firstAvailable?.id || '';
    }
    return '';
  });
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: '',
    distance_category_id: '',
    gender: '',
    age: '',
    t_shirt_size: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ registration_number: string, emailQueued?: boolean, emailDeliveryFailed?: boolean, qrToken?: string, invoiceUrl?: string | null } | null>(null);

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId) || null;
  const isPaidSelected = selectedTicket?.ticket_type === 'paid';
  const isTicketUnavailable = selectedTicket
    ? (selectedTicket.status === 'sold_out' || selectedTicket.status === 'sales_ended' || selectedTicket.status === 'scheduled')
    : false;
  const formatSalesStart = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: event?.timezone || undefined })
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Ticket validation
    if (tickets && tickets.length > 0) {
      if (!selectedTicketId) {
        setFormError("Please select a ticket tier.");
        return;
      }
      if (isPaidSelected && !paymentsEnabled) {
        setFormError("Online payment isn't available for this event yet. Choose a free ticket, or contact the organizer.");
        return;
      }
      if (isTicketUnavailable) {
        setFormError("The selected ticket is no longer available.");
        return;
      }
    }
    
    const found = validatePublicRegistration(formData, isWalkathon);
    setFieldErrors(found);
    if (hasErrors(found)) {
      setFormError(null);
      focusFirstError();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Paid ticket: take the payment first; the registration then uses the verified order.
    let paidOrderId: string | null = null;
    if (isPaidSelected && selectedTicket) {
      try {
        paidOrderId = await payWithRazorpay({
          orderUrl: '/api/payments/razorpay/order',
          orderBody: { eventId: event.id, ticketTypeId: selectedTicket.id, email: formData.email.trim(), checkout: formData },
          title: event.name,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          color: (themeStyle as Record<string, string> | undefined)?.['--color-primary'],
          cancelledMessage: 'Payment cancelled. Your ticket is not booked yet.',
        });
      } catch (err) {
        setFormError((err as Error).message);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Sanitize formData
      const cleanData: any = { ...formData };
      if (!cleanData.distance_category_id) delete cleanData.distance_category_id;
      if (selectedTicketId) {
        cleanData.ticket_type_id = selectedTicketId;
        cleanData.quantity = 1;
      }
      if (paidOrderId) cleanData.payment_order_id = paidOrderId;
      
      const result = await submitRegistrationServerAction(event.id, cleanData);
      if (!result.ok) {
        if (!paidOrderId) {
          setFormError(result.error);
        } else if (result.payment === 'refunded') {
          setFormError(`${result.error} Your payment has been refunded in full. It usually reaches your account in 5–7 working days.`);
        } else if (result.payment === 'released') {
          setFormError(`${result.error} You have not been charged: your bank will release the held amount automatically.`);
        } else {
          setFormError(`Your payment went through, but the registration didn't complete: ${result.error} Contact the organizer with order ID ${paidOrderId} for a refund.`);
        }
        return;
      }
      setSuccessData({
        registration_number: result.registration_number,
        emailQueued: result.emailQueued,
        emailDeliveryFailed: result.emailDeliveryFailed,
        invoiceUrl: result.invoiceUrl,
        qrToken: result.qrToken
      });
    } catch {
      setFormError(paidOrderId
        ? `Your payment went through, but we couldn't confirm the registration. Contact the organizer with order ID ${paidOrderId}.`
        : "Something went wrong while registering. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };



  if (error && !successData) {
    return themed(
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-outline-variant/40 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold text-on-surface mb-2">Registration Unavailable</h1>
          <p className="text-body-md text-on-surface-variant mb-8">{error}</p>
          <Link href={`/events/${slug}`} className="px-6 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors">
            Return to Event Page
          </Link>
        </div>
      </div>
    );
  }

  if (successData) {
    const selectedDistance = walkathonDistances.find(d => d.id === formData.distance_category_id);
    
    const ticketData = {
      event,
      attendee: {
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email,
        phone: formData.phone,
      },
      registration: {
        registrationNumber: successData.registration_number,
      },
      rawToken: successData.qrToken, // Render the real QR credential token
      distanceCategory: selectedDistance,
      ticketName: selectedTicket?.name,
    };

    const tokens = (themeStyle ?? {}) as Record<string, string | undefined>;
    const accent = tokens['--color-primary'];
    const backdrop = typeof tokens.backgroundColor === 'string' ? tokens.backgroundColor : undefined;
    const calendarUrl = googleCalendarUrl(event);

    return themed(
      <div className="min-h-screen bg-surface-container-lowest">
        <header className="border-b border-outline-variant/60 bg-surface print:hidden">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
            <Link href={`/events/${slug}`} className="inline-flex min-w-0 items-center gap-2 text-[14px] font-semibold text-on-surface hover:text-primary">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
              <span className="truncate">{event?.name}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-14">
          <div className="print:hidden">
            <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_-10px_var(--color-primary)]">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20 motion-reduce:hidden" aria-hidden="true" />
              <span className="material-symbols-outlined relative text-[34px]" aria-hidden="true">check</span>
            </span>
            <h1 className="mt-6 text-[28px] font-bold leading-tight text-on-surface sm:text-[32px]">You&rsquo;re registered!</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-on-surface-variant">
              {successData.emailDeliveryFailed || !successData.emailQueued ? (
                <>Your spot is saved. Download or print your ticket below.</>
              ) : (
                <>
                  We&rsquo;ve emailed your ticket{successData.invoiceUrl ? ' and invoice' : ''} to <strong className="font-semibold text-on-surface">{formData.email}</strong>.
                </>
              )}
            </p>
          </div>

          {successData.invoiceUrl && (
            <a
              href={successData.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-outline-variant/70 bg-surface px-5 py-2.5 text-[14px] font-semibold text-on-surface hover:border-primary hover:text-primary print:hidden"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">receipt_long</span>
              View and download invoice
            </a>
          )}

          {successData.emailDeliveryFailed && (
            <div className="mt-5 flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-[14px] text-amber-900 print:hidden">
              <span className="material-symbols-outlined text-[20px] text-amber-600" aria-hidden="true">mail</span>
              <p>We couldn&rsquo;t send the confirmation email, so keep this ticket: download it or save it as a PDF.</p>
            </div>
          )}

          {!successData.qrToken && (
            <div className="mt-5 flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-[14px] text-amber-900 print:hidden">
              <span className="material-symbols-outlined text-[20px] text-amber-600" aria-hidden="true">qr_code_2</span>
              <p>Your registration is saved, but the QR code couldn&rsquo;t be created. Contact the organizer with registration number <strong>{successData.registration_number}</strong>.</p>
            </div>
          )}

          {settings?.confirmation_message && (
            <figure className="mt-6 w-full rounded-xl border border-outline-variant/70 bg-surface px-5 py-4 text-left print:hidden">
              <figcaption className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">A note from the organizer</figcaption>
              <blockquote className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-on-surface">{settings.confirmation_message}</blockquote>
            </figure>
          )}

          <div className="mt-8 w-full">
            <TicketTemplate data={ticketData} accent={accent} backdrop={backdrop} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] font-semibold print:hidden">
            {calendarUrl && (
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_add_on</span>
                Add to Google Calendar
              </a>
            )}
            <Link href={`/events/${slug}`} className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">language</span>
              Back to the event website
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const update = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [key]: e.target.value });

  const submitDisabled =
    isSubmitting || (isWalkathon && walkathonDistances.length === 0) || (isPaidSelected && !paymentsEnabled) || isTicketUnavailable;
  const hasTickets = tickets && tickets.length > 0;
  const heading = role === 'attendee' ? settings?.title?.trim() || 'Register for this event' : `Become a ${role}`;
  const intro =
    role === 'attendee'
      ? settings?.description?.trim() || 'Fill in your details to save your spot. Your ticket arrives by email.'
      : `Choose a package to support ${event?.name}.`;

  return themed(
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-outline-variant/60 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={`/events/${slug}`}
            className="inline-flex min-w-0 items-center gap-2 text-[14px] font-semibold text-on-surface hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            <span className="truncate">{event?.name}</span>
          </Link>
          <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-[12px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>
            Secure registration
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          {/* Event summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <EventSummary event={event} selectedTicket={role === 'attendee' ? selectedTicket : null} />
          </aside>

          {/* Form */}
          <section className="min-w-0 rounded-[var(--website-card-radius,16px)] border border-outline-variant/70 bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)]">
            <div className="px-5 pt-6 sm:px-8 sm:pt-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">Registration</p>
              <h1 className="mt-1.5 text-[24px] sm:text-[28px] font-bold leading-tight text-on-surface">
                {heading.charAt(0).toUpperCase() + heading.slice(1)}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-on-surface-variant">{intro}</p>
            </div>

            <div className="px-5 pb-6 pt-6 sm:px-8 sm:pb-8">
              {formError && (
                <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
                  <span className="material-symbols-outlined text-[20px] text-red-600" aria-hidden="true">error</span>
                  <p>{formError}</p>
                </div>
              )}

              {roles.length > 1 && (
                <div
                  className="mb-7 grid gap-1 rounded-xl bg-on-surface/[0.05] p-1"
                  style={{ gridTemplateColumns: `repeat(${roles.length}, minmax(0, 1fr))` }}
                  role="radiogroup"
                  aria-label="How would you like to join?"
                >
                  {roles.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={role === option.id}
                      onClick={() => {
                        setRole(option.id);
                        setFormError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-semibold transition-all ${
                        role === option.id
                          ? 'bg-surface text-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {role !== 'attendee' ? (
                <SponsorRequestForm
                  key={role}
                  eventId={event.id}
                  eventName={event.name}
                  kind={role}
                  packages={sponsorPackages.filter((p) => p.kind === role)}
                  options={sponsorOptions}
                  paymentsEnabled={paymentsEnabled}
                  color={(themeStyle as Record<string, string> | undefined)?.['--color-primary']}
                />
              ) : (
                <form
                  onSubmit={handleSubmit}
                  onChange={(e) => setFieldErrors((prev) => withoutFieldError(prev, (e.target as unknown as HTMLInputElement).name))}
                  noValidate
                  className="flex flex-col gap-8"
                >
                  {hasTickets && (
                    <fieldset className="space-y-3">
                      <StepLegend number={1} title="Choose your ticket" aside={`${tickets.length} ${tickets.length === 1 ? 'option' : 'options'}`} />
                      <div className="grid grid-cols-1 gap-3">
                        {tickets.map((ticket) => {
                          const isSelected = selectedTicketId === ticket.id;
                          const isSoldOut = ticket.status === 'sold_out';
                          const isEnded = ticket.status === 'sales_ended';
                          const isScheduled = ticket.status === 'scheduled';
                          const isUnavailable = isSoldOut || isEnded || isScheduled;
                          const fewLeft = ticket.quantity_remaining !== undefined && ticket.quantity_remaining <= 10 && !isSoldOut;

                          return (
                            <label
                              key={ticket.id}
                              className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/[0.04] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]'
                                  : isUnavailable
                                    ? 'cursor-not-allowed border-outline-variant/50 opacity-55'
                                    : 'cursor-pointer border-outline-variant hover:border-primary/50 hover:bg-primary/[0.02]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="selected_ticket"
                                disabled={isUnavailable}
                                value={ticket.id}
                                checked={isSelected}
                                onChange={() => setSelectedTicketId(ticket.id)}
                                className="peer sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 ${
                                  isSelected ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'
                                }`}
                              >
                                {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-3">
                                  <span className="text-[15px] font-semibold text-on-surface">{ticket.name}</span>
                                  <span className="shrink-0 text-[16px] font-bold text-on-surface">
                                    {ticket.price_amount > 0 ? formatPaiseToINR(ticket.price_amount) : 'Free'}
                                  </span>
                                </span>
                                {ticket.description && (
                                  <span className="mt-1 block text-[13px] leading-relaxed text-on-surface-variant line-clamp-2">{ticket.description}</span>
                                )}
                                <span className="mt-2.5 flex flex-wrap items-center gap-2">
                                  {isSoldOut ? (
                                    <StatusChip tone="danger">Sold out</StatusChip>
                                  ) : isEnded ? (
                                    <StatusChip tone="neutral">Sales ended</StatusChip>
                                  ) : isScheduled ? (
                                    <StatusChip tone="info">
                                      {ticket.sales_start_at ? `Sales open ${formatSalesStart(ticket.sales_start_at)}` : 'Sales open soon'}
                                    </StatusChip>
                                  ) : (
                                    <StatusChip tone="success">Available</StatusChip>
                                  )}
                                  {fewLeft && <span className="text-[12px] font-semibold text-amber-700">Only {ticket.quantity_remaining} left</span>}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {isPaidSelected && !paymentsEnabled && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
                          <span className="material-symbols-outlined text-[20px] text-amber-600" aria-hidden="true">account_balance_wallet</span>
                          <p>
                            <strong className="block font-semibold text-amber-950">Online payment isn&rsquo;t available yet</strong>
                            Paid tickets can&rsquo;t be bought here at the moment. Choose a free ticket, or contact the organizer.
                          </p>
                        </div>
                      )}
                    </fieldset>
                  )}

                  <fieldset className="space-y-5">
                    <StepLegend number={hasTickets ? 2 : 1} title="Your details" aside="* Required" />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="First name" name="first_name" icon="person" autoComplete="given-name" required value={formData.first_name} onChange={update('first_name')} error={fieldErrors.first_name} />
                      <Field label="Last name" name="last_name" autoComplete="family-name" required value={formData.last_name} onChange={update('last_name')} error={fieldErrors.last_name} />
                    </div>
                    <Field label="Email" name="email" type="email" icon="mail" autoComplete="email" inputMode="email" placeholder="you@example.com" hint="Your ticket and QR code are sent here." required value={formData.email} onChange={update('email')} error={fieldErrors.email} />
                    <Field label="Phone" name="phone" type="tel" icon="call" autoComplete="tel" inputMode="tel" placeholder="98765 43210" required value={formData.phone} onChange={update('phone')} error={fieldErrors.phone} />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Organization" name="organization" icon="apartment" autoComplete="organization" optional value={formData.organization} onChange={update('organization')} error={fieldErrors.organization} />
                      <Field label="Job title" name="job_title" icon="work" autoComplete="organization-title" optional value={formData.job_title} onChange={update('job_title')} error={fieldErrors.job_title} />
                    </div>
                  </fieldset>

                  {isWalkathon && (
                    <fieldset className="space-y-5">
                      <StepLegend number={hasTickets ? 3 : 2} title="Walkathon details" />
                      <div className="space-y-2">
                        <span className="block text-[13px] font-semibold text-on-surface">
                          Distance <span className="text-primary">*</span>
                        </span>
                        {walkathonDistances.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                            {walkathonDistances.map((distance) => {
                              const picked = formData.distance_category_id === distance.id;
                              return (
                                <label
                                  key={distance.id}
                                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-[14px] font-semibold transition-all ${
                                    picked
                                      ? 'border-primary bg-primary/[0.06] text-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]'
                                      : 'border-outline-variant text-on-surface hover:border-primary/50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="distance_category_id"
                                    value={distance.id}
                                    checked={picked}
                                    onChange={update('distance_category_id')}
                                    className="sr-only"
                                    required
                                  />
                                  {picked && <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>}
                                  {distance.name}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
                            <p className="font-semibold">Distances aren&rsquo;t set up yet</p>
                            <p>The organizer hasn&rsquo;t added any distance categories, so registration can&rsquo;t be completed. Please contact them.</p>
                          </div>
                        )}
                        <FieldError message={fieldErrors.distance_category_id} />
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <SelectField label="Gender" name="gender" required value={formData.gender} onChange={update('gender')} error={fieldErrors.gender} placeholder="Select gender" options={['Male', 'Female', 'Other', 'Prefer not to say']} />
                        <Field label="Age" name="age" type="number" inputMode="numeric" min={1} max={120} required value={formData.age} onChange={update('age')} error={fieldErrors.age} />
                      </div>
                      <SelectField label="T-shirt size" name="t_shirt_size" required value={formData.t_shirt_size} onChange={update('t_shirt_size')} error={fieldErrors.t_shirt_size} placeholder="Select size" options={['XS', 'S', 'M', 'L', 'XL', 'XXL']} />
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Emergency contact name" name="emergency_contact_name" icon="emergency" required value={formData.emergency_contact_name} onChange={update('emergency_contact_name')} error={fieldErrors.emergency_contact_name} />
                        <Field label="Emergency contact phone" name="emergency_contact_phone" type="tel" icon="call" inputMode="tel" required value={formData.emergency_contact_phone} onChange={update('emergency_contact_phone')} error={fieldErrors.emergency_contact_phone} />
                      </div>
                    </fieldset>
                  )}

                  {/* Summary and submit */}
                  <div className="-mx-5 -mb-6 mt-2 rounded-b-[var(--website-card-radius,16px)] border-t border-outline-variant/70 bg-on-surface/[0.02] px-5 py-5 sm:-mx-8 sm:-mb-8 sm:px-8">
                    {selectedTicket && (
                      <div className="mb-4 flex items-center justify-between gap-3 text-[14px]">
                        <span className="min-w-0 truncate text-on-surface-variant">
                          1 × <span className="font-medium text-on-surface">{selectedTicket.name}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[18px] font-bold text-on-surface">
                          {selectedTicket.price_amount > 0 ? formatPaiseToINR(selectedTicket.price_amount) : 'Free'}
                        </span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitDisabled}
                      className="flex h-12 w-full items-center justify-center gap-2 bg-primary px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--color-primary)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">progress_activity</span>
                          Registering…
                        </>
                      ) : isPaidSelected && !paymentsEnabled ? (
                        'Online payment not available'
                      ) : isTicketUnavailable ? (
                        selectedTicket?.status === 'scheduled' ? 'Ticket sales not open yet' : 'This ticket is unavailable'
                      ) : (
                        <>
                          {isPaidSelected && selectedTicket ? `Pay ${formatPaiseToINR(selectedTicket.price_amount)} and register` : 'Complete registration'}
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{isPaidSelected ? 'lock' : 'arrow_forward'}</span>
                        </>
                      )}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">verified_user</span>
                      {isPaidSelected ? 'Payments are processed securely by Razorpay.' : 'Your details are shared only with the event organizer.'}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


/* ───────────── pieces of the registration form ───────────── */

/** A Google Calendar "add event" link for the event's date and times, in its own time zone. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function googleCalendarUrl(event: any): string | null {
  if (!event?.start_date) return null;
  const day = (d: string) => d.replace(/-/g, '');
  const at = (d: string, t?: string | null) => (t ? `${day(d)}T${t.slice(0, 5).replace(':', '')}00` : day(d));
  const start = at(event.start_date, event.start_time);
  const endDay = event.end_date || event.start_date;
  // An all-day event ends on the following day in calendar terms.
  const end = event.start_time
    ? at(endDay, event.end_time || event.start_time)
    : day(new Date(new Date(`${endDay}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name || 'Event',
    dates: `${start}/${end}`,
    details: (event.description || '').slice(0, 800),
    location: cleanLocation(event.location),
  });
  if (event.timezone) params.set('ctz', event.timezone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}


function formatEventDate(date?: string | null) {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatEventTime(time?: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventSummary({ event, selectedTicket }: { event: any; selectedTicket: PublicTicketAvailability | null }) {
  const start = formatEventDate(event?.start_date);
  const end = event?.end_date && event.end_date !== event.start_date ? formatEventDate(event.end_date) : '';
  const time = [formatEventTime(event?.start_time), formatEventTime(event?.end_time)].filter(Boolean).join(' – ');
  const place = cleanLocation(event?.location) || (event?.format === 'Virtual' ? 'Online' : '');
  const rows = [
    { icon: 'calendar_today', primary: end ? `${start} – ${end}` : start, secondary: time },
    { icon: event?.format === 'Virtual' ? 'videocam' : 'location_on', primary: place, secondary: event?.format },
  ].filter((r) => r.primary);

  return (
    <div className="overflow-hidden rounded-[var(--website-card-radius,16px)] border border-outline-variant/70 bg-surface">
      <div className="relative bg-primary px-6 py-7 text-white sm:px-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(circle_at_85%_15%,white,transparent_45%),radial-gradient(circle_at_10%_110%,white,transparent_40%)]"
        />
        <p className="relative text-[12px] font-semibold uppercase tracking-[0.08em] text-white/80">{event?.type || 'Event'}</p>
        <h2 className="relative mt-1.5 text-[22px] sm:text-[24px] font-bold leading-snug">{event?.name}</h2>
      </div>
      <div className="space-y-4 px-6 py-5 sm:px-7">
        {rows.map((r) => (
          <div key={r.icon} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary" aria-hidden="true">
              <span className="material-symbols-outlined text-[19px]">{r.icon}</span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] font-semibold text-on-surface">{r.primary}</p>
              {r.secondary && <p className="text-[13px] text-on-surface-variant">{r.secondary}</p>}
            </div>
          </div>
        ))}
        {event?.description && (
          <p className="hidden border-t border-outline-variant/60 pt-4 text-[13px] leading-relaxed text-on-surface-variant line-clamp-5 lg:block">
            {event.description}
          </p>
        )}
        {selectedTicket && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/[0.06] px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">confirmation_number</span>
              <span className="truncate font-medium">{selectedTicket.name}</span>
            </span>
            <span className="shrink-0 text-[14px] font-bold text-on-surface">
              {selectedTicket.price_amount > 0 ? formatPaiseToINR(selectedTicket.price_amount) : 'Free'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLegend({ number, title, aside }: { number: number; title: string; aside?: string }) {
  return (
    <legend className="flex w-full items-center gap-3 pb-1">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">{number}</span>
      <span className="flex-1 text-[16px] font-semibold text-on-surface">{title}</span>
      {aside && <span className="text-[12px] text-on-surface-variant">{aside}</span>}
    </legend>
  );
}

function StatusChip({ tone, children }: { tone: 'success' | 'danger' | 'neutral' | 'info'; children: React.ReactNode }) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    danger: 'bg-rose-50 text-rose-700 ring-rose-600/15',
    neutral: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {tone === 'success' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      {children}
    </span>
  );
}

const INPUT_CLASS =
  'h-12 w-full rounded-[10px] border border-outline-variant bg-surface text-[15px] text-on-surface placeholder:text-on-surface-variant/55 outline-none transition-[border-color,box-shadow] hover:border-on-surface-variant/40 focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_14%,transparent)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]';

function FieldLabel({ htmlFor, label, required, optional }: { htmlFor: string; label: string; required?: boolean; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
      {label}
      {required && <span className="text-primary" aria-hidden="true">*</span>}
      {optional && <span className="rounded-full bg-on-surface/[0.06] px-1.5 py-px text-[11px] font-medium text-on-surface-variant">Optional</span>}
    </label>
  );
}

function Field({
  label,
  name,
  icon,
  hint,
  error,
  optional,
  required,
  ...input
}: {
  label: string;
  name: string;
  icon?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `reg-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} required={required} optional={optional} />
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-on-surface-variant/70" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={input.type ?? 'text'}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${INPUT_CLASS} ${icon ? 'pl-11' : 'pl-4'} pr-4`}
          {...input}
        />
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-[12px] text-on-surface-variant">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  error,
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: string[];
  placeholder: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const id = `reg-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        <select
          id={id}
          name={name}
          required={required}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={onChange}
          className={`${INPUT_CLASS} appearance-none pl-4 pr-10 ${value ? '' : 'text-on-surface-variant/70'}`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant" aria-hidden="true">
          expand_more
        </span>
      </div>
      <FieldError message={error} />
    </div>
  );
}
