"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { registrationsService } from '@/services/registrations';
import { ticketService } from '@/services/ticketService';
import { MoreOptions } from '@/components/ui/MoreOptions';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { FieldErrors, hasErrors, validateRegistrationSettings, withoutFieldError } from '@/lib/validation/forms';
import WebsiteLinkField from '@/components/website-editor/WebsiteLinkField';
import { Registration, EventRegistrationSettings } from '@/types';
import { downloadCsv } from '@/lib/csv';

export default function OrganizerRegistrationPage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<EventRegistrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [ticketCount, setTicketCount] = useState(0);
  const [isOpening, setIsOpening] = useState(false);

  // Settings Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    capacity: '' as string | number,
    confirmation_message: ''
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'failed'>('all');

  const event = getEvent(eventId);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [regs, sets, ticketTypes] = await Promise.all([
        registrationsService.getEventRegistrations(eventId),
        registrationsService.getEventRegistrationSettings(eventId),
        ticketService.getEventTicketTypes(eventId)
      ]);
      setRegistrations(regs);
      setTicketCount(ticketTypes.tickets?.length ?? 0);
      
      if (sets) {
        setSettings(sets);
        setFormData({
          title: sets.title || '',
          description: sets.description || '',
          capacity: sets.capacity || '',
          confirmation_message: sets.confirmation_message || ''
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Unable to load registration data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchData();
    }
  }, [isHydrated, eventId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateRegistrationSettings(formData);
    setFieldErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      const cap = formData.capacity === '' ? null : parseInt(formData.capacity as string, 10);
      const updated = await registrationsService.updateEventRegistrationSettings(eventId, {
        is_enabled: settings?.is_enabled ?? false,
        title: formData.title || null,
        description: formData.description || null,
        capacity: cap && cap >= 1 ? cap : null,
        confirmation_message: formData.confirmation_message || null
      });
      setSettings(updated);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // A first ticket opens registration on its own (see ticketService.createTicketType).
  const handleAddFreeTicket = async () => {
    setIsOpening(true);
    setError(null);
    try {
      await ticketService.createTicketType(eventId, {
        name: 'General Admission',
        ticket_type: 'free',
        price_in_rupees: 0,
        quantity_total: settings?.capacity || 100,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Could not add the ticket. Please try again.');
    } finally {
      setIsOpening(false);
    }
  };

  const handleSetOpen = async (isOpen: boolean) => {
    setIsOpening(true);
    setError(null);
    try {
      setSettings(await registrationsService.updateEventRegistrationSettings(eventId, { is_enabled: isOpen }));
    } catch (err: any) {
      setError(err.message || 'Could not update registration. Please try again.');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCancelRegistration = async (registration: Registration) => {
    if (confirm(`Are you sure you want to cancel the registration for ${registration.person?.first_name}? This cannot be undone.`)) {
      try {
        await registrationsService.cancelRegistration(registration.id);
        await fetchData();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel registration');
      }
    }
  };

  // Derived metrics
  const metrics = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'confirmed').length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    
    // Active includes pending + confirmed. For capacity logic we can use this.
    const active = confirmed + pending;
    let remaining: string | number = 'Unlimited';
    if (settings?.capacity) {
      remaining = Math.max(0, settings.capacity - active);
    }

    return { total, confirmed, pending, cancelled, remaining };
  }, [registrations, settings]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const first = r.person?.first_name?.toLowerCase() || '';
        const last = r.person?.last_name?.toLowerCase() || '';
        const email = r.person?.email?.toLowerCase() || '';
        const regNum = r.registration_number.toLowerCase();
        if (!first.includes(query) && !last.includes(query) && !email.includes(query) && !regNum.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [registrations, searchQuery, statusFilter]);

  // Downloads what the table shows, so the search and status filter carry over to the file.
  const handleDownloadAttendees = () => {
    if (filteredRegistrations.length === 0) return;
    const meta = (reg: Registration, key: string) => (reg.metadata?.[key] as string | undefined) ?? '';
    const isWalkathon = registrations.some((r) => r.distance_category_id);

    const headers = [
      'Registration #', 'First Name', 'Last Name', 'Email', 'Phone', 'Organization', 'Job Title',
      'Ticket', 'Status', 'Registered At', 'Cancelled At',
      ...(isWalkathon ? ['Distance', 'Gender', 'Age', 'T-Shirt Size', 'Emergency Contact', 'Emergency Phone'] : []),
    ];
    const rows = filteredRegistrations.map((reg) => [
      reg.registration_number,
      reg.person?.first_name,
      reg.person?.last_name,
      reg.person?.email,
      reg.person?.phone,
      reg.person?.organization,
      reg.person?.job_title,
      reg.ticket_type?.name || meta(reg, 'ticket_type_name'),
      reg.status,
      reg.registered_at ? new Date(reg.registered_at).toLocaleString() : '',
      reg.cancelled_at ? new Date(reg.cancelled_at).toLocaleString() : '',
      ...(isWalkathon
        ? [
            reg.distance_category?.name,
            meta(reg, 'gender'),
            meta(reg, 'age'),
            meta(reg, 't_shirt_size'),
            meta(reg, 'emergency_contact_name'),
            meta(reg, 'emergency_contact_phone'),
          ]
        : []),
    ]);

    const name = (event?.name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    downloadCsv(`${name}-attendees-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (!isHydrated || !event) {
    return <div className="p-10 text-center text-on-surface-variant">Loading workspace...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      {/* Header */}
      <header className="min-h-14 border-b border-outline-variant/60 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 bg-surface-container-lowest z-10">
        <button onClick={() => router.push(`/app/events/${eventId}`)} className="text-on-surface-variant hover:text-on-surface p-1">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <h1 className="text-label-md font-bold text-on-surface leading-tight">REGISTRATION</h1>
          <div className="text-xs text-on-surface-variant">Manage how attendees register for {event.name}</div>
        </div>
      </header>

      <main className="flex-1 max-w-[1760px] mx-auto w-full p-4 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-10 items-start">
        
        {/* Left Column: Settings */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Registration status */}
          {!loading && (
            <section className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${settings?.is_enabled ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-ds-ink font-space">
                    {settings?.is_enabled ? 'Registration is open' : 'Registration is not open yet'}
                  </h2>
                  <p className="text-[12px] text-ds-muted font-jakarta mt-0.5">
                    {settings?.is_enabled
                      ? 'Share this link so people can register.'
                      : ticketCount > 0
                        ? 'People can register as soon as you open it.'
                        : 'Add a ticket and people can start registering.'}
                  </p>
                </div>
              </div>

              {settings?.is_enabled ? (
                <>
                  <WebsiteLinkField slug={event.slug} path="/register" label="Registration link" />
                  <div className="flex items-center justify-between text-[12px] font-semibold font-jakarta">
                    <Link href={`/app/events/${eventId}/tickets`} className="text-ds-accent hover:text-ds-accent-strong">
                      Manage tickets
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleSetOpen(false)}
                      disabled={isOpening}
                      className="text-ds-muted hover:text-ds-ink disabled:opacity-50"
                    >
                      Close registration
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={ticketCount > 0 ? () => handleSetOpen(true) : handleAddFreeTicket}
                    disabled={isOpening}
                    className="inline-flex items-center h-10 px-4 rounded-lg bg-ds-accent hover:bg-ds-accent-strong text-white text-[13px] font-semibold transition-colors disabled:opacity-60 font-jakarta"
                  >
                    {isOpening ? 'Opening...' : ticketCount > 0 ? 'Open registration' : 'Add a free ticket'}
                  </button>
                  <Link
                    href={`/app/events/${eventId}/tickets`}
                    className="inline-flex items-center h-10 px-4 rounded-lg border border-ds-line text-ds-ink text-[13px] font-semibold hover:border-ds-accent hover:text-ds-accent transition-colors font-jakarta"
                  >
                    {ticketCount > 0 ? 'Manage tickets' : 'Set up tickets'}
                  </Link>
                </div>
              )}
            </section>
          )}

          <form onSubmit={handleSaveSettings} onChange={(e) => setFieldErrors((prev) => withoutFieldError(prev, (e.target as unknown as HTMLInputElement).name))} noValidate className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-title-md font-bold text-on-surface">Registration Details</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Maximum attendees (leave empty for no limit)</label>
              <input 
                type="number" 
                name="capacity"
 aria-invalid={Boolean(fieldErrors.capacity)}
 value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                placeholder="e.g. 500"
                min="1"
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
              />
<FieldError message={fieldErrors.capacity} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Confirmation Message</label>
              <textarea 
                name="confirmation_message"
 aria-invalid={Boolean(fieldErrors.confirmation_message)}
 value={formData.confirmation_message}
                onChange={e => setFormData({...formData, confirmation_message: e.target.value})}
                placeholder="Shown to people after they register"
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md resize-y min-h-[80px]"
              />
<FieldError message={fieldErrors.confirmation_message} />
            </div>

            <MoreOptions label="Customize the registration page" defaultOpen={Boolean(formData.title || formData.description)}>
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">Public Title</label>
                <input 
                  type="text" 
                  name="title"
 aria-invalid={Boolean(fieldErrors.title)}
 value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Register for Aram Events"
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
                />
<FieldError message={fieldErrors.title} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">Description</label>
                <textarea 
                  name="description"
 aria-invalid={Boolean(fieldErrors.description)}
 value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief instructions for attendees..."
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md resize-y min-h-[80px]"
                />
<FieldError message={fieldErrors.description} />
              </div>
            </MoreOptions>

            <button 
              type="submit" 
              disabled={isSaving}
              className="mt-2 w-full px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving...' : savedNotice ? 'Saved' : 'Save'}
            </button>
            {error && <div className="text-error text-body-sm text-center">{error}</div>}
          </form>

          {/* Metrics Card */}
          {metrics.total > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <h3 className="text-title-sm font-bold text-on-surface mb-4">Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-body-sm text-on-surface-variant">Total Registrations</div>
                <div className="text-headline-sm font-bold text-on-surface">{metrics.total}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Confirmed</div>
                <div className="text-headline-sm font-bold text-green-700">{metrics.confirmed}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Cancelled</div>
                <div className="text-title-md font-bold text-error">{metrics.cancelled}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Capacity Remaining</div>
                <div className="text-title-md font-bold text-on-surface">{metrics.remaining}</div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right Column: Registration List */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-title-lg font-bold text-on-surface">
              Attendees{!loading && <span className="text-on-surface-variant font-medium"> ({filteredRegistrations.length})</span>}
            </h2>
            
            {registrations.length > 0 && (
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded focus:border-primary focus:outline-none text-sm"
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded text-sm focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>

              <button
                type="button"
                onClick={handleDownloadAttendees}
                disabled={loading || filteredRegistrations.length === 0}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download the attendee list as a CSV file (opens in Excel or Google Sheets)"
              >
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
            )}
          </div>

          <div className="bg-white border border-outline-variant/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/40">
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Registration #</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Attendee</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Date</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Status</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant">
                        {registrations.length === 0
                          ? 'No one has registered yet. People who register will show up here.'
                          : 'No registrations match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-on-surface bg-surface-container px-2 py-1 rounded">
                            {reg.registration_number}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm text-on-surface">
                            {reg.person?.first_name} {reg.person?.last_name}
                          </div>
                          <div className="text-xs text-on-surface-variant">{reg.person?.email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">
                          {new Date(reg.registered_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            reg.status === 'cancelled' ? 'bg-error-container text-on-error-container' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {reg.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleCancelRegistration(reg)}
                              className="text-error hover:bg-error/10 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
