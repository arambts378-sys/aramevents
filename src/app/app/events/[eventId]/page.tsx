'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { createClient } from '@/lib/supabase/client';

export default function EventWorkspacePage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, updateEvent, currentUser, isHydrated } = useAppContext();

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState<{
    registrations: number;
    checkIns: number;
    attendanceRate: number | null;
  } | null>(null);

  const event = getEvent(eventId);

  const handleTogglePublish = async () => {
    if (!event) return;
    const nextStatus = event.status === 'published' ? 'draft' : 'published';
    if (nextStatus === 'published' && !confirm('Publish this event? It will become visible to the public.')) return;
    if (nextStatus === 'draft' && !confirm('Unpublish this event? The public site will no longer be accessible.')) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await updateEvent({ ...event, status: nextStatus });
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Failed to update event status.');
    } finally {
      setPublishing(false);
    }
  };

  // Load real overview metrics for this event
  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      if (!eventId) return;
      try {
        const supabase = createClient();
        const [regRes, checkinRes] = await Promise.all([
          supabase.from('registrations').select('id').eq('event_id', eventId),
          supabase.from('check_ins').select('registration_id').eq('event_id', eventId).eq('result', 'allowed'),
        ]);

        if (!isMounted) return;

        const regCount = regRes.data?.length || 0;
        const checkins = checkinRes.data || [];
        const uniqueCheckins = new Set(checkins.map((c: any) => c.registration_id)).size;
        const rate = regCount > 0 ? Math.round((uniqueCheckins / regCount) * 100) : null;

        setMetrics({
          registrations: regCount,
          checkIns: uniqueCheckins,
          attendanceRate: rate,
        });
      } catch (err) {
        console.error('Failed to load event metrics:', err);
      }
    }

    loadMetrics();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Date formatting helper
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBA';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Time formatting helper
  const formatDisplayTime = (start?: string, end?: string) => {
    if (!start && !end) return 'Time TBA';
    const formatSingle = (t?: string) => {
      if (!t) return '';
      try {
        const parts = t.split(':');
        if (parts.length >= 2) {
          const hour = parseInt(parts[0], 10);
          const minute = parts[1];
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 === 0 ? 12 : hour % 12;
          return `${displayHour}:${minute} ${period}`;
        }
        return t;
      } catch {
        return t;
      }
    };
    const s = formatSingle(start);
    const e = formatSingle(end);
    if (s && e) return `${s} – ${e}`;
    return s || e || 'Time TBA';
  };

  // Timezone helper
  const getTimezoneDetail = (tz?: string) => {
    if (!tz) return 'UTC';
    if (tz === 'Asia/Kolkata') return 'UTC +05:30 (IST)';
    if (tz === 'America/New_York') return 'UTC -05:00 / -04:00 (ET)';
    if (tz === 'America/Los_Angeles') return 'UTC -08:00 / -07:00 (PT)';
    if (tz === 'Europe/London') return 'UTC +00:00 / +01:00 (GMT/BST)';
    if (tz === 'Europe/Berlin') return 'UTC +01:00 / +02:00 (CET)';
    if (tz === 'Asia/Singapore') return 'UTC +08:00 (SGT)';
    if (tz === 'Asia/Dubai') return 'UTC +04:00 (GST)';
    return tz;
  };

  // Semantic status badge styling
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'draft').toLowerCase().trim();
    if (s === 'published' || s === 'live' || s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{s}</span>
        </span>
      );
    }
    if (s === 'archived') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
          <span>Archived</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F1FF] border border-[#E6E2F0] text-[#77738A] font-mono text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#77738A]"></span>
        <span>Draft</span>
      </span>
    );
  };

  // 1. Loading Skeleton State
  if (!isHydrated) {
    return (
      <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen">
        <div className="min-h-screen flex flex-row w-full max-w-[1440px] mx-auto bg-[#F7F5FF]">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 bg-[#F7F5FF] min-h-screen px-6 py-8 lg:px-12 lg:py-12 overflow-y-auto w-full md:w-[calc(100%-230px)]">
            <div className="max-w-[1240px] mx-auto space-y-8 animate-pulse">
              <div className="h-5 w-32 bg-[#E6E2F0] rounded-md" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-[#E6E2F0] rounded" />
                <div className="h-10 w-72 bg-[#E6E2F0] rounded-xl" />
                <div className="h-4 w-48 bg-[#E6E2F0] rounded" />
              </div>
              <div className="h-52 bg-white border border-[#E6E2F0] rounded-2xl" />
              <div className="h-10 w-96 bg-[#E6E2F0] rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-48 bg-white border border-[#E6E2F0] rounded-2xl" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 2. Event Not Found State
  if (!event) {
    return (
      <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen">
        <div className="min-h-screen flex flex-row w-full max-w-[1440px] mx-auto bg-[#F7F5FF]">
          <Sidebar
            currentUser={currentUser}
            mobileOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
          <main className="flex-1 bg-[#F7F5FF] min-h-screen p-6 flex items-center justify-center w-full md:w-[calc(100%-230px)]">
            <div className="max-w-md w-full bg-white border border-[#E6E2F0] rounded-2xl p-8 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto border border-[#E6E2F0]">
                <span className="material-symbols-outlined text-[24px]">event_busy</span>
              </div>
              <h1 className="text-[20px] font-bold text-[#17152B] font-space">
                Event Not Found
              </h1>
              <p className="text-[13px] text-[#77738A] font-jakarta">
                The event you are looking for does not exist or has been removed from this workspace.
              </p>
              <div className="pt-2">
                <Link
                  href="/app/events"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg transition-colors shadow-xs font-jakarta"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to Events</span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 3. Render Redesigned Event Workspace
  const formattedDate = formatDisplayDate(event.startDate);
  const formattedTime = formatDisplayTime(event.startTime, event.endTime);
  const locationString = event.location || (event.format === 'Virtual' ? 'Online / Remote' : 'Location TBA');

  const workspaceModules = [
    {
      title: 'Website Builder',
      description: 'Design and publish your event landing page and sections.',
      icon: 'web',
      href: `/app/events/${event.id}/website/editor`,
    },
    {
      title: 'Registration',
      description: 'Manage ticketing, forms, and attendee data.',
      icon: 'how_to_reg',
      href: `/app/events/${event.id}/registration`,
    },
    {
      title: 'Tickets & Pricing',
      description: 'Manage ticket types, pricing, availability and sales.',
      icon: 'sell',
      href: `/app/events/${event.id}/tickets`,
    },
    {
      title: 'People & Roles',
      description: 'Manage attendees, staff, and team permissions.',
      icon: 'badge',
      href: `/app/events/${event.id}/people`,
    },
    {
      title: 'QR & Access',
      description: 'Configure QR access, checkpoints, and entitlements.',
      icon: 'qr_code_2',
      href: `/app/events/${event.id}/operations/access-control`,
    },
  ];

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen">
      <div className="min-h-screen flex flex-row w-full max-w-[1440px] mx-auto bg-[#F7F5FF]">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 bg-[#F7F5FF] min-h-screen overflow-y-auto w-full md:w-[calc(100%-230px)]">
          <div className="max-w-[1240px] mx-auto px-6 py-8 lg:px-10 lg:py-10 space-y-8">
            {/* 1. TOP NAVIGATION & EYEBROW HIERARCHY */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href="/app/events"
                  className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-[#77738A] hover:text-[#7C5CFC] transition-colors group font-jakarta"
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform duration-150">
                    arrow_back
                  </span>
                  <span>Back to Events</span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#17152B] bg-white border border-[#E6E2F0] rounded-lg shadow-xs"
                  aria-label="Open navigation menu"
                >
                  <span className="material-symbols-outlined text-[16px]">menu</span>
                  <span>Menu</span>
                </button>
              </div>

              {/* Event Identity Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#77738A]">
                      EVENT WORKSPACE
                    </span>
                  </div>
                  <h1 className="text-[36px] md:text-[44px] lg:text-[48px] tracking-tight font-bold text-[#17152B] leading-none font-space">
                    {event.name}
                  </h1>
                  <p className="text-[14px] text-[#77738A] font-jakarta">
                    {formattedDate} · {event.format || 'Format TBA'} · {locationString}
                  </p>
                </div>

                {/* Header Actions (Status & View Public Site) */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-3">
                    {renderStatusBadge(event.status)}

                    {/* Publish / Unpublish Button */}
                    <button
                      id="btn-toggle-publish"
                      type="button"
                      onClick={handleTogglePublish}
                      disabled={publishing}
                      className={`inline-flex items-center gap-1.5 px-4 h-10 rounded-xl font-semibold text-[13px] transition-all shadow-xs font-jakarta border ${
                        event.status === 'published'
                          ? 'bg-white border-[#E6E2F0] text-[#77738A] hover:border-amber-400 hover:text-amber-700'
                          : 'bg-[#7C5CFC] border-[#7C5CFC] text-white hover:bg-[#5B3FE8] hover:border-[#5B3FE8]'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                      aria-label={event.status === 'published' ? 'Unpublish event' : 'Publish event'}
                    >
                      {publishing ? (
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {event.status === 'published' ? 'unpublished' : 'publish'}
                        </span>
                      )}
                      <span>{publishing ? 'Saving…' : event.status === 'published' ? 'Unpublish' : 'Go Live'}</span>
                    </button>

                    <Link
                      href={`/events/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs font-jakarta"
                    >
                      <span>View Public Site</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                    </Link>
                  </div>

                  {/* Inline error */}
                  {publishError && (
                    <p className="text-[12px] text-red-600 font-jakarta">{publishError}</p>
                  )}
                </div>
              </div>
            </section>

            {/* 2. EVENT SUMMARY CARD */}
            <section className="bg-white border border-[#E6E2F0] rounded-2xl p-7 shadow-xs">
              <div className="space-y-1 pb-6 border-b border-[#E6E2F0]">
                <h2 className="text-[16px] font-bold text-[#17152B] font-space">
                  {event.name}
                </h2>
                <p className="text-[13px] text-[#77738A] font-jakarta leading-relaxed">
                  {event.description || 'No description provided.'}
                </p>
              </div>

              {/* Metadata Grid (4-Column Desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] block font-jakarta">
                    Date &amp; Time
                  </span>
                  <p className="text-[14px] font-semibold text-[#17152B] leading-snug font-jakarta">
                    {formattedDate}
                  </p>
                  <p className="text-[12px] text-[#77738A] font-jakarta">
                    {formattedTime}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] block font-jakarta">
                    Format &amp; Location
                  </span>
                  <p className="text-[14px] font-semibold text-[#17152B] leading-snug font-jakarta">
                    {event.format || 'Format TBA'}
                  </p>
                  <p className="text-[12px] text-[#77738A] font-jakarta truncate" title={locationString}>
                    {locationString}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] block font-jakarta">
                    Event Type
                  </span>
                  <p className="text-[14px] font-semibold text-[#17152B] leading-snug font-jakarta">
                    {event.type || 'Standard Event'}
                  </p>
                  <p className="text-[12px] text-[#77738A] font-jakarta">
                    {event.type === 'Walkathon' ? 'Sporting & Community' : 'Event Operations'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] block font-jakarta">
                    Timezone
                  </span>
                  <p className="text-[14px] font-semibold text-[#17152B] leading-snug font-jakarta">
                    {event.timezone || 'UTC'}
                  </p>
                  <p className="text-[12px] text-[#77738A] font-jakarta">
                    {getTimezoneDetail(event.timezone)}
                  </p>
                </div>
              </div>
            </section>

            {/* 3. QUICK ACTIONS */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold tracking-wider text-[#77738A] uppercase font-jakarta">
                Quick actions
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/app/events/${event.id}/website/editor`}
                  className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs active:scale-[0.99] font-jakarta"
                >
                  <span className="material-symbols-outlined text-[17px]">web</span>
                  <span>Website Builder</span>
                </Link>

                <Link
                  href={`/app/events/${event.id}/registration`}
                  className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs active:scale-[0.99] font-jakarta"
                >
                  <span className="material-symbols-outlined text-[17px]">confirmation_number</span>
                  <span>Registration</span>
                </Link>

                <Link
                  href={`/app/events/${event.id}/tickets`}
                  className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs active:scale-[0.99] font-jakarta"
                >
                  <span className="material-symbols-outlined text-[17px]">sell</span>
                  <span>Tickets &amp; Pricing</span>
                </Link>

                <Link
                  href={`/app/events/${event.id}/people`}
                  className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs active:scale-[0.99] font-jakarta"
                >
                  <span className="material-symbols-outlined text-[17px]">person</span>
                  <span>People</span>
                </Link>

                <Link
                  href={`/app/events/${event.id}/operations/access-control`}
                  className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] hover:text-[#7C5CFC] transition-colors shadow-xs active:scale-[0.99] font-jakarta"
                >
                  <span className="material-symbols-outlined text-[17px]">qr_code_scanner</span>
                  <span>QR &amp; Access</span>
                </Link>
              </div>
            </section>

            {/* 4. EVENT WORKSPACE MODULES (3-Column Grid) */}
            <section className="space-y-4">
              <div>
                <h2 className="text-[19px] font-bold text-[#17152B] font-space">
                  Event workspace
                </h2>
                <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
                  Manage the tools and operations for this event.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {workspaceModules.map((mod) => (
                  <div
                    key={mod.title}
                    className="group bg-white border border-[#E6E2F0] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#7C5CFC]/60 hover:shadow-sm transition-all duration-200 shadow-xs"
                  >
                    <div className="space-y-4">
                      <div className="w-11 h-11 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center border border-[#E6E2F0]/50 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">
                          {mod.icon}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[16px] font-bold text-[#17152B] font-space">
                          {mod.title}
                        </h3>
                        <p className="text-[13px] text-[#77738A] leading-relaxed font-jakarta">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Link
                        href={mod.href}
                        className="inline-flex items-center gap-1.5 text-[13px] text-[#7C5CFC] font-semibold group-hover:gap-2 transition-all font-jakarta"
                      >
                        <span>Open workspace</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. EVENT OVERVIEW METRICS (Real Data) */}
            {metrics !== null && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-[19px] font-bold text-[#17152B] font-space">
                    Event overview
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Metric 1: Registrations */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta block">
                      Registrations
                    </span>
                    <div className="text-[36px] font-bold text-[#17152B] font-space leading-tight">
                      {metrics.registrations.toLocaleString()}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      Total registered attendees
                    </p>
                  </div>

                  {/* Metric 2: Check-ins */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta block">
                        Check-ins
                      </span>
                      {metrics.checkIns > 0 && (
                        <span className="w-2 h-2 rounded-full bg-[#7C5CFC] animate-pulse" title="Live sync" />
                      )}
                    </div>
                    <div className="text-[36px] font-bold text-[#17152B] font-space leading-tight">
                      {metrics.checkIns.toLocaleString()}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      Verified entries on site
                    </p>
                  </div>

                  {/* Metric 3: Attendance Rate */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta block">
                      Attendance
                    </span>
                    <div className="text-[36px] font-bold text-[#17152B] font-space leading-tight">
                      {metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : '—'}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      {metrics.attendanceRate !== null ? 'Turnout rate' : 'No registrations recorded'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Contextual Bottom Metadata */}
            <div className="pt-8 border-t border-[#E6E2F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#77738A] text-[12px] font-jakarta">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC]"></span>
                <span>ARAM BTS Event Infrastructure</span>
              </div>
              <div>
                <span>Event ID: <span className="font-mono text-[#17152B]">{event.id}</span></span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
