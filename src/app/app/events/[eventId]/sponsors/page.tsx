'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { MoreOptions } from '@/components/ui/MoreOptions';
import { SponsorPackagesPanel } from '@/components/sponsors/SponsorPackagesPanel';
import { formatPaiseToINR } from '@/services/ticketService';
import { sponsorsService } from '@/services/sponsors';
import {
  EventSponsor,
  SPONSOR_PAYMENT_LABELS,
  SponsorKind,
  SponsorPaymentStatus,
  rupeesToPaiseAmount,
  sponsorBalance,
  sponsorPaymentStatus,
  summarizeSponsors,
} from '@/lib/events/sponsors';
import {
  FieldErrors,
  SponsorFormValues,
  hasErrors,
  validatePaymentAmount,
  validateSponsorForm,
  withoutFieldError,
} from '@/lib/validation/forms';

const EMPTY_FORM: SponsorFormValues = {
  name: '',
  tier: '',
  amount_agreed: '',
  amount_received: '0',
  due_date: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website_url: '',
  notes: '',
};

const INPUT =
  'w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent font-jakarta';

const STATUS_STYLES: Record<SponsorPaymentStatus, string> = {
  not_charged: 'bg-zinc-100 text-zinc-600',
  unpaid: 'bg-amber-50 text-amber-800',
  part_paid: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
};

const paiseToInput = (paise: number) => String(paise / 100);

export default function SponsorsPage() {
  const eventId = useParams()?.eventId as string;
  const { getEvent, currentUser, isHydrated } = useAppContext();
  const event = getEvent(eventId);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SponsorKind>('all');

  // Add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventSponsor | null>(null);
  const [kind, setKind] = useState<SponsorKind>('sponsor');
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [form, setForm] = useState<SponsorFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Record payment
  const [paying, setPaying] = useState<EventSponsor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentErrors, setPaymentErrors] = useState<FieldErrors>({});

  const [deleting, setDeleting] = useState<EventSponsor | null>(null);

  const load = useCallback(async () => {
    try {
      setPageError(null);
      setSponsors(await sponsorsService.list(eventId));
    } catch (err) {
      console.error('Failed to load sponsors:', err);
      const tableMissing = (err as { code?: string })?.code === 'PGRST205';
      setPageError(
        tableMissing
          ? 'Sponsors needs a database update before it can be used. Run supabase/migrations/20261105000000_event_sponsors.sql.'
          : 'Could not load sponsors. Please refresh and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isHydrated && eventId) load();
  }, [isHydrated, eventId, load]);

  const today = new Date().toLocaleDateString('en-CA');
  const totals = useMemo(() => summarizeSponsors(sponsors), [sponsors]);
  // Older rows may predate requests, so anything without a status counts as approved.
  const approved = sponsors.filter((s) => (s.request_status ?? 'approved') === 'approved');
  const requests = sponsors.filter((s) => s.request_status === 'pending');
  const shown = filter === 'all' ? approved : approved.filter((s) => s.kind === filter);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const openForm = (sponsor: EventSponsor | null, newKind: SponsorKind = 'sponsor') => {
    setEditing(sponsor);
    setKind(sponsor?.kind ?? newKind);
    setShowOnWebsite(sponsor?.show_on_website ?? true);
    setForm(
      sponsor
        ? {
            name: sponsor.name,
            tier: sponsor.tier ?? '',
            amount_agreed: paiseToInput(sponsor.amount_agreed),
            amount_received: paiseToInput(sponsor.amount_received),
            due_date: sponsor.due_date ?? '',
            contact_name: sponsor.contact_name ?? '',
            contact_email: sponsor.contact_email ?? '',
            contact_phone: sponsor.contact_phone ?? '',
            website_url: sponsor.website_url ?? '',
            notes: sponsor.notes ?? '',
          }
        : EMPTY_FORM,
    );
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const field = (name: keyof SponsorFormValues) => ({
    id: `sponsor-${name}`,
    name,
    value: form[name],
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `sponsor-${name}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors(withoutFieldError(errors, name));
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSponsorForm(form);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSaving(true);
    setFormError(null);
    const input = {
      kind,
      name: form.name.trim(),
      tier: form.tier.trim() || null,
      amount_agreed: rupeesToPaiseAmount(form.amount_agreed),
      amount_received: rupeesToPaiseAmount(form.amount_received),
      due_date: form.due_date || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim().toLowerCase() || null,
      contact_phone: form.contact_phone.trim() || null,
      website_url: form.website_url.trim() || null,
      notes: form.notes.trim() || null,
      show_on_website: showOnWebsite,
    };
    try {
      if (editing) await sponsorsService.update(editing.id, input);
      else await sponsorsService.create(eventId, input);
      setFormOpen(false);
      flash(`${input.name} saved.`);
      await load();
    } catch (err) {
      console.error('Failed to save sponsor:', err);
      setFormError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    const found = validatePaymentAmount(paymentAmount, sponsorBalance(paying) / 100);
    setPaymentErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSaving(true);
    try {
      await sponsorsService.recordPayment(paying, rupeesToPaiseAmount(paymentAmount));
      flash(`Payment recorded for ${paying.name}.`);
      setPaying(null);
      await load();
    } catch (err) {
      setPaymentErrors({ amount: err instanceof Error ? err.message : 'Could not record the payment. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (sponsor: EventSponsor, status: 'approved' | 'declined') => {
    try {
      await sponsorsService.reviewRequest(sponsor.id, status);
      flash(status === 'approved' ? `${sponsor.name} approved.` : `${sponsor.name} declined.`);
      await load();
    } catch (err) {
      console.error('Failed to review request:', err);
      setPageError('Could not update this request. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await sponsorsService.remove(deleting.id);
      flash(`${deleting.name} removed.`);
      setDeleting(null);
      await load();
    } catch (err) {
      console.error('Failed to delete sponsor:', err);
      setPageError('Could not remove this entry. Please try again.');
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  if (!isHydrated || !event) {
    return <div className="p-10 text-center text-ds-muted font-jakarta">Loading workspace...</div>;
  }

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
        <Sidebar currentUser={currentUser} mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
          <div className="w-full space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/app/events/${eventId}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-ds-muted hover:text-ds-accent transition-colors font-jakarta"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to Workspace</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-lg shadow-xs"
                  aria-label="Open navigation menu"
                >
                  <span className="material-symbols-outlined text-[16px]">menu</span>
                  <span>Menu</span>
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div className="space-y-1">
                  <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-ds-muted">
                    EVENT WORKSPACE · {event.name}
                  </span>
                  <h1 className="text-[32px] md:text-[40px] tracking-tight font-bold text-ds-ink leading-none font-space">
                    SPONSORS &amp; PARTNERS
                  </h1>
                  <p className="text-[14px] text-ds-muted font-jakarta">
                    Keep track of who is paying, how much, and what is still due.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openForm(null, 'partner')}
                    className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-ds-line text-ds-ink font-semibold text-[13px] hover:border-ds-accent hover:text-ds-accent transition-colors font-jakarta"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Add Partner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openForm(null, 'sponsor')}
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-semibold text-[13px] transition-colors shadow-xs font-jakarta"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Add Sponsor</span>
                  </button>
                </div>
              </div>
            </section>

            {notice && (
              <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-jakarta flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                <span>{notice}</span>
              </div>
            )}
            {pageError && (
              <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-jakarta flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-600 text-[20px]">error</span>
                <span>{pageError}</span>
              </div>
            )}

            <SponsorPackagesPanel eventId={eventId} slug={event.slug} />

            {requests.length > 0 && (
              <section className="bg-white border border-ds-accent/40 rounded-2xl shadow-xs overflow-hidden" aria-labelledby="requests-title">
                <h2 id="requests-title" className="p-4 border-b border-ds-line text-[15px] font-bold text-ds-ink font-space">
                  New requests ({requests.length})
                </h2>
                <ul className="divide-y divide-ds-line">
                  {requests.map((request) => (
                    <li key={request.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 font-jakarta">
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-ds-ink font-space truncate">
                          {request.name} · {request.tier} · {formatPaiseToINR(request.amount_agreed)}
                        </p>
                        <p className="text-[12px] text-ds-muted truncate">
                          {[request.contact_name, request.contact_email, request.contact_phone].filter(Boolean).join(' · ')}
                        </p>
                        {request.notes && <p className="text-[12px] text-ds-ink mt-1">{request.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReview(request, 'declined')}
                          className="px-3.5 h-9 rounded-lg border border-ds-line text-[13px] font-semibold text-ds-ink hover:border-rose-400 hover:text-rose-600 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(request, 'approved')}
                          className="px-3.5 h-9 rounded-lg bg-ds-accent hover:bg-ds-accent-strong text-white text-[13px] font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {approved.length > 0 && (
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total agreed', value: totals.agreed, tone: 'text-ds-ink' },
                  { label: 'Received', value: totals.received, tone: 'text-emerald-700' },
                  { label: 'Still to collect', value: totals.balance, tone: totals.balance > 0 ? 'text-amber-700' : 'text-ds-ink' },
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">{card.label}</span>
                    <div className={`text-[26px] font-bold font-space leading-tight mt-1 ${card.tone}`}>
                      {formatPaiseToINR(card.value)}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-[13px] text-ds-muted font-jakarta">Loading...</div>
              ) : approved.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-3 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto border border-ds-line">
                    <span className="material-symbols-outlined text-[28px]">handshake</span>
                  </div>
                  <h2 className="text-[18px] font-bold text-ds-ink font-space">No sponsors or partners yet</h2>
                  <p className="text-[13px] text-ds-muted font-jakarta leading-relaxed">
                    Add who is supporting your event and the amount they agreed to pay.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-ds-line flex items-center gap-1">
                    {(['all', 'sponsor', 'partner'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        aria-pressed={filter === value}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors font-jakarta ${
                          filter === value ? 'bg-ds-accent-soft text-ds-accent' : 'text-ds-muted hover:text-ds-ink'
                        }`}
                      >
                        {value === 'all' ? `All (${approved.length})` : `${value === 'sponsor' ? 'Sponsors' : 'Partners'} (${approved.filter((s) => s.kind === value).length})`}
                      </button>
                    ))}
                  </div>

                  <ul className="divide-y divide-ds-line">
                    {shown.map((sponsor) => {
                      const balance = sponsorBalance(sponsor);
                      const status = sponsorPaymentStatus(sponsor, today);
                      return (
                        <li key={sponsor.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-ds-ink font-space text-[15px] truncate">{sponsor.name}</h3>
                              <span className="text-[11px] font-semibold text-ds-muted capitalize font-jakarta">
                                {sponsor.tier ? `${sponsor.tier} ${sponsor.kind}` : sponsor.kind}
                              </span>
                            </div>
                            {(sponsor.contact_name || sponsor.contact_email) && (
                              <p className="text-[12px] text-ds-muted font-jakarta truncate mt-0.5">
                                {[sponsor.contact_name, sponsor.contact_email].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>

                          <dl className="grid grid-cols-3 gap-4 lg:w-[360px] shrink-0 font-jakarta">
                            <div>
                              <dt className="text-[11px] text-ds-muted">Agreed</dt>
                              <dd className="text-[13px] font-semibold text-ds-ink">{formatPaiseToINR(sponsor.amount_agreed)}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] text-ds-muted">Received</dt>
                              <dd className="text-[13px] font-semibold text-emerald-700">{formatPaiseToINR(sponsor.amount_received)}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] text-ds-muted">Balance</dt>
                              <dd className="text-[13px] font-semibold text-ds-ink">{formatPaiseToINR(balance)}</dd>
                            </div>
                          </dl>

                          <div className="flex items-center justify-between lg:justify-end gap-2 lg:w-[250px] shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-jakarta ${STATUS_STYLES[status]}`}>
                              {SPONSOR_PAYMENT_LABELS[status]}
                            </span>
                            <div className="flex items-center gap-1">
                              {balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaying(sponsor);
                                    setPaymentAmount(paiseToInput(balance));
                                    setPaymentErrors({});
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-ds-line text-[12px] font-semibold text-ds-ink hover:border-ds-accent hover:text-ds-accent transition-colors font-jakarta"
                                >
                                  Record payment
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openForm(sponsor)}
                                aria-label={`Edit ${sponsor.name}`}
                                className="p-1.5 text-ds-muted hover:text-ds-accent hover:bg-ds-subtle rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleting(sponsor)}
                                aria-label={`Remove ${sponsor.name}`}
                                className="p-1.5 text-ds-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            {approved.some((s) => s.show_on_website) && (
              <p className="text-[12px] text-ds-muted font-jakarta">
                Names appear on your website when the Sponsors section is added in the{' '}
                <Link href={`/app/events/${eventId}/website/editor`} className="font-semibold text-ds-accent hover:text-ds-accent-strong">
                  website builder
                </Link>
                . Amounts are never shown publicly.
              </p>
            )}
          </div>
        </main>
      </div>

      {/* Add / edit */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-form-title"
            className="bg-white border border-ds-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 id="sponsor-form-title" className="text-[18px] font-bold text-ds-ink font-space">
                {editing ? `Edit ${editing.name}` : `Add ${kind === 'sponsor' ? 'Sponsor' : 'Partner'}`}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close" className="text-ds-muted hover:text-ds-ink p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {formError && (
              <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[13px] font-jakarta">
                {formError}
              </p>
            )}

            <form onSubmit={handleSave} noValidate className="space-y-4 font-jakarta">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
                {(['sponsor', 'partner'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => setKind(value)}
                    className={`p-2.5 rounded-xl border text-[13px] font-bold capitalize transition-colors ${
                      kind === value ? 'border-ds-accent bg-ds-accent-soft text-ds-ink' : 'border-ds-line text-ds-muted hover:border-ds-accent/40'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="sponsor-name" className="text-[13px] font-semibold text-ds-ink block mb-1">Name *</label>
                <input type="text" placeholder="e.g. Acme Corporation" className={INPUT} {...field('name')} />
                <FieldError id="sponsor-name-error" message={errors.name} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sponsor-amount_agreed" className="text-[13px] font-semibold text-ds-ink block mb-1">Agreed amount (₹) *</label>
                  <input type="text" inputMode="decimal" placeholder="50000" className={INPUT} {...field('amount_agreed')} />
                  <FieldError id="sponsor-amount_agreed-error" message={errors.amount_agreed} />
                </div>
                <div>
                  <label htmlFor="sponsor-amount_received" className="text-[13px] font-semibold text-ds-ink block mb-1">Received so far (₹) *</label>
                  <input type="text" inputMode="decimal" placeholder="0" className={INPUT} {...field('amount_received')} />
                  <FieldError id="sponsor-amount_received-error" message={errors.amount_received} />
                </div>
              </div>

              <MoreOptions label="Add contact, level and due date" defaultOpen={Boolean(editing)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sponsor-tier" className="text-[12px] font-medium text-ds-muted block mb-1">Level</label>
                    <input type="text" placeholder="e.g. Gold" className={INPUT} {...field('tier')} />
                    <FieldError id="sponsor-tier-error" message={errors.tier} />
                  </div>
                  <div>
                    <label htmlFor="sponsor-due_date" className="text-[12px] font-medium text-ds-muted block mb-1">Payment due</label>
                    <input type="date" className={INPUT} {...field('due_date')} />
                    <FieldError id="sponsor-due_date-error" message={errors.due_date} />
                  </div>
                </div>
                <div>
                  <label htmlFor="sponsor-contact_name" className="text-[12px] font-medium text-ds-muted block mb-1">Contact name</label>
                  <input type="text" className={INPUT} {...field('contact_name')} />
                  <FieldError id="sponsor-contact_name-error" message={errors.contact_name} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sponsor-contact_email" className="text-[12px] font-medium text-ds-muted block mb-1">Contact email</label>
                    <input type="email" className={INPUT} {...field('contact_email')} />
                    <FieldError id="sponsor-contact_email-error" message={errors.contact_email} />
                  </div>
                  <div>
                    <label htmlFor="sponsor-contact_phone" className="text-[12px] font-medium text-ds-muted block mb-1">Contact phone</label>
                    <input type="tel" className={INPUT} {...field('contact_phone')} />
                    <FieldError id="sponsor-contact_phone-error" message={errors.contact_phone} />
                  </div>
                </div>
                <div>
                  <label htmlFor="sponsor-website_url" className="text-[12px] font-medium text-ds-muted block mb-1">Website</label>
                  <input type="url" placeholder="https://" className={INPUT} {...field('website_url')} />
                  <FieldError id="sponsor-website_url-error" message={errors.website_url} />
                </div>
                <div>
                  <label htmlFor="sponsor-notes" className="text-[12px] font-medium text-ds-muted block mb-1">Notes</label>
                  <textarea rows={2} className={`${INPUT} resize-y`} {...field('notes')} />
                  <FieldError id="sponsor-notes-error" message={errors.notes} />
                </div>
                <label className="flex items-center gap-2.5 text-[13px] text-ds-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnWebsite}
                    onChange={(e) => setShowOnWebsite(e.target.checked)}
                    className="w-4 h-4 accent-[#6D50F5]"
                  />
                  <span>Show the name on the event website</span>
                </label>
              </MoreOptions>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ds-line">
                <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-ds-accent text-white font-semibold text-[13px] hover:bg-ds-accent-strong transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : `Add ${kind === 'sponsor' ? 'Sponsor' : 'Partner'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record payment */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="bg-white border border-ds-line rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 font-jakarta">
            <div>
              <h2 id="payment-title" className="text-[18px] font-bold text-ds-ink font-space">Record a payment</h2>
              <p className="text-[13px] text-ds-muted mt-0.5">
                {paying.name} has {formatPaiseToINR(sponsorBalance(paying))} left to pay.
              </p>
            </div>
            <form onSubmit={handleRecordPayment} noValidate className="space-y-4">
              <div>
                <label htmlFor="payment-amount" className="text-[13px] font-semibold text-ds-ink block mb-1">Amount received (₹) *</label>
                <input
                  id="payment-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  aria-invalid={Boolean(paymentErrors.amount)}
                  aria-describedby={paymentErrors.amount ? 'payment-amount-error' : undefined}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    setPaymentErrors({});
                  }}
                  className={INPUT}
                />
                <FieldError id="payment-amount-error" message={paymentErrors.amount} />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setPaying(null)} className="px-4 py-2.5 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-ds-accent text-white font-semibold text-[13px] hover:bg-ds-accent-strong transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="bg-white border border-ds-line rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 font-jakarta">
            <div>
              <h2 id="delete-title" className="text-[18px] font-bold text-ds-ink font-space">Remove {deleting.name}?</h2>
              <p className="text-[13px] text-ds-muted mt-1">Their payment record will be deleted too. This can&apos;t be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setDeleting(null)} className="px-4 py-2 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-[13px] hover:bg-rose-700 transition-colors disabled:opacity-60">
                {saving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
