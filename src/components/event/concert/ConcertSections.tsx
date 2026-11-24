'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ticketService, formatPaiseToINR } from '@/services/ticketService';
import type { PublicTicketAvailability } from '@/types';

/*
 * The Concert template: a gig poster hero, show details, the story of the show, a ticket wall
 * with every seating zone and its price, the venue and a closing "book now". Every section reads
 * the organizer's own text from the website editor first and only falls back to concert wording.
 */

type Content = Record<string, unknown>;
type SectionProps = { event: any; section?: { content?: Content } };

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);

/** "2026-01-16 - 2026-01-17" (as the public page passes it) or a single ISO date → parts */
function showDate(event: any) {
  const raw: string = event?.startDate || event?.date || '';
  const iso = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return {
    day: d.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    full: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
    short: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

/** "17:30:00" → "5:30 PM" */
function clock(t?: string) {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Show time from "17:30:00 - 00:00:00" → "5:30 PM – 12:00 AM" */
function showTime(event: any) {
  // Prefer the raw 24-hour times: `time` may already be formatted for display ("9:00 am – 6:00 pm").
  const raw: string = [event?.startTime, event?.endTime].filter(Boolean).join(' - ') || event?.time || '';
  const [start, end] = raw.split(/\s+[-–]\s+/);
  const s = clock(start);
  const e = clock(end);
  return s && e ? `${s} – ${e}` : s;
}

/** Show start as a Date in the viewer's clock, from the event's date and start time */
function showStart(event: any): Date | null {
  const raw: string = event?.startDate || event?.date || '';
  const iso = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!iso) return null;
  const t = String(event?.startTime || String(event?.time || '').split(/\s+[-–]\s+/)[0] || '').match(/^(\d{1,2}):(\d{2})/);
  const d = new Date(iso + 'T' + (t ? t[1].padStart(2, '0') + ':' + t[2] : '00:00') + ':00');
  return isNaN(d.getTime()) ? null : d;
}

const venueOf = (event: any): string => event?.venue || event?.location || 'Venue to be announced';

const registerHref = (event: any, ticketId?: string) =>
  `/events/${event?.slug || event?.id}/register${ticketId ? `?ticket=${encodeURIComponent(ticketId)}` : ''}`;

/** Public tickets for the event, shared by the hero ("from ₹…") and the ticket wall. */
function usePublicTickets(eventId?: string) {
  const [tickets, setTickets] = useState<PublicTicketAvailability[] | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    ticketService
      .getPublicTicketAvailability(eventId)
      .then((list) => alive && setTickets(list || []))
      .catch(() => alive && setTickets([]));
    return () => {
      alive = false;
    };
  }, [eventId]);
  return tickets;
}

function lowestPrice(tickets: PublicTicketAvailability[] | null) {
  const onSale = (tickets || []).filter((t) => t.status === 'on_sale');
  if (onSale.length === 0) return null;
  if (onSale.some((t) => t.ticket_type === 'free')) return 'Free entry';
  return `From ${formatPaiseToINR(Math.min(...onSale.map((t) => t.price_amount)))}`;
}

const btn = 'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all active:scale-[0.98]';
const radius = { borderRadius: 'var(--website-button-radius)' } as const;
const card = { borderRadius: 'var(--website-card-radius)' } as const;

/* ------------------------------------------------------------------------------------------ */

/** "Show starts in 12 days 04 hrs 33 mins": only before the show, and only after mounting (the server can't know the viewer's clock). */
function Countdown({ startsAt, centered }: { startsAt: Date | null; centered: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  const startMs = startsAt?.getTime() ?? null;
  useEffect(() => {
    if (startMs === null) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [startMs]);
  if (startMs === null || now === null) return null;
  const ms = startMs - now;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const parts = [
    { v: Math.floor(mins / 1440), l: 'days' },
    { v: Math.floor((mins % 1440) / 60), l: 'hrs' },
    { v: mins % 60, l: 'mins' },
  ];
  return (
    <div className={'flex items-center gap-4 ' + (centered ? 'justify-center' : '')}>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--website-muted)]">Show starts in</span>
      <div className="flex gap-2">
        {parts.map((p) => (
          <div key={p.l} className="min-w-[3.25rem] rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-center backdrop-blur">
            <div className="text-lg font-black leading-none tabular-nums">{String(p.v).padStart(2, '0')}</div>
            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--website-muted)]">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConcertHero({ event, section, websiteConfig }: SectionProps & { websiteConfig?: any }) {
  const c = section?.content || {};
  const tickets = usePublicTickets(event?.id);
  const image = str(c.image) || str(event?.flyer);
  const date = showDate(event);
  const time = showTime(event);
  const from = lowestPrice(tickets);
  const ctaText = str(c.primaryCtaText) || 'Book tickets';
  const ctaHref = str(c.primaryCtaDest) || registerHref(event);
  const eyebrow = str(c.eyebrow) || 'Live in concert';
  const showTitle = c.showTitle ?? true;
  const showDescription = c.showDescription ?? true;
  // A short line under the title: the hero's own subtitle, else the About section's headline.
  const about = websiteConfig?.sections?.find((x: any) => x.type === 'about' && x.visible)?.content;
  const tagline = str(c.subtitle) || str(about?.title);
  const onSale = (tickets || []).filter((t) => t.status === 'on_sale');
  const zones = onSale.length;
  const sellingFast = onSale.some((t) => t.quantity_total > 0 && t.quantity_remaining / t.quantity_total <= 0.2);
  const startsAt = showStart(event);
  const details = [
    date && { icon: 'calendar_month', label: 'Date', value: date.short },
    time && { icon: 'schedule', label: 'Show time', value: time },
    { icon: 'location_on', label: 'Venue', value: venueOf(event) },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <section className="relative isolate overflow-hidden bg-[var(--website-background)] text-[var(--website-text)]">
      {/* Poster artwork, blurred, as the stage-light backdrop */}
      {image ? (
        <img src={image} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 20% 0%, color-mix(in srgb, var(--website-primary) 45%, transparent), transparent 70%), radial-gradient(50% 45% at 90% 30%, color-mix(in srgb, var(--website-accent) 35%, transparent), transparent 70%), linear-gradient(to bottom, transparent 40%, var(--website-background))',
        }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 @min-[40rem]:px-10 @min-[64rem]:grid-cols-12 @min-[64rem]:gap-14 @min-[64rem]:py-20">
        <div className={`space-y-7 ${image ? '@min-[64rem]:col-span-7' : '@min-[64rem]:col-span-12 text-center'}`}>
          <div className={`flex flex-wrap items-center gap-2.5 ${image ? '' : 'justify-center'}`}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--website-border)] bg-black/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--website-accent)] backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--website-accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--website-accent)]" />
              </span>
              {eyebrow}
            </span>
            {sellingFast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--website-primary)_22%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">local_fire_department</span>
                Selling fast
              </span>
            )}
          </div>

          {showTitle && (
            <h1 className="font-black leading-[0.95] tracking-[-0.02em] text-[clamp(2.6rem,6.5cqw,5.75rem)]">
              <span className="bg-gradient-to-br from-white via-white to-[color-mix(in_srgb,var(--website-accent)_70%,white)] bg-clip-text text-transparent">
                {event?.name}
              </span>
            </h1>
          )}

          {showDescription && tagline && (
            <p className={`max-w-xl text-lg leading-relaxed text-[var(--website-muted)] ${image ? '' : 'mx-auto'}`}>{tagline}</p>
          )}

          {/* Show details in one panel: date, time, venue */}
          <dl
            className={`grid max-w-3xl overflow-hidden border border-white/10 bg-black/35 backdrop-blur-md @min-[40rem]:grid-cols-[auto_auto_minmax(0,1fr)] ${image ? '' : 'mx-auto text-left'}`}
            style={card}
          >
            {details.map((item) => (
              <div key={item.label} className="flex items-start gap-3 border-white/10 px-5 py-4 [&:not(:first-child)]:border-t @min-[40rem]:[&:not(:first-child)]:border-l @min-[40rem]:[&:not(:first-child)]:border-t-0">
                <span className="material-symbols-outlined mt-0.5 text-[20px] text-[var(--website-accent)]" aria-hidden="true">{item.icon}</span>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--website-muted)]">{item.label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold leading-snug">{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <Countdown startsAt={startsAt} centered={!image} />

          <div className={`flex flex-wrap items-center gap-x-6 gap-y-4 pt-1 ${image ? '' : 'justify-center'}`}>
            {(c.showPrimaryCta ?? true) && (
              <Link href={ctaHref} className={`${btn} w-full @min-[40rem]:w-auto bg-[var(--website-primary)] px-9 py-4 text-sm text-white shadow-[0_10px_40px_-10px_var(--website-primary)] hover:brightness-110`} style={radius}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">confirmation_number</span>
                {ctaText}
              </Link>
            )}
            {zones > 0 && (
              <a href="#registration" className={`${btn} w-full @min-[40rem]:w-auto border border-white/20 bg-white/5 px-6 py-4 text-sm text-white backdrop-blur hover:border-white/40 hover:bg-white/10`} style={radius}>
                View seating &amp; prices
              </a>
            )}
            {from && (
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--website-muted)]">Tickets</div>
                <div className="text-xl font-black">{from.replace(/^From /, 'from ')}</div>
              </div>
            )}
          </div>
        </div>

        {image && (
          // On phones the poster leads, above the title; from desktop width it sits on the right.
          <div className="order-first @min-[64rem]:order-none @min-[64rem]:col-span-5">
            <div className="relative mx-auto max-w-sm @min-[64rem]:max-w-none">
              <div aria-hidden="true" className="absolute -inset-3 rounded-[28px] bg-[var(--website-primary)] opacity-30 blur-2xl" />
              <img src={image} alt={`${event?.name ?? 'Concert'} poster`} className="relative block h-auto w-full rotate-[1.5deg] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function ConcertInfo({ event, section }: SectionProps) {
  const c = section?.content || {};
  const tickets = usePublicTickets(event?.id);
  const onSale = (tickets || []).filter((t) => t.status === 'on_sale');
  const from = lowestPrice(tickets);
  // The hero already shows date, time and venue; this strip answers "how do I get in?"
  const items = [
    from && { icon: 'sell', label: 'Tickets', value: from },
    onSale.length > 0 && {
      icon: 'event_seat',
      label: 'Seating',
      value: onSale.length === 1 ? '1 zone available' : onSale.length + ' zones available',
    },
    { icon: 'qr_code_2', label: 'Entry', value: 'QR e-ticket at the gate' },
    { icon: 'mark_email_read', label: 'Confirmation', value: 'Instant, by email' },
    str(c.ageLimit) && { icon: 'person', label: 'Age', value: str(c.ageLimit) as string },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <section className="border-y border-[var(--website-border)] bg-[var(--website-surface)] text-[var(--website-text)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 @min-[40rem]:px-10 @min-[64rem]:grid-cols-4">
        {items.slice(0, 4).map((it) => (
          <div key={it.label} className="flex flex-col items-start gap-2.5 py-5 pr-3 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:gap-3.5 @min-[40rem]:py-6 @min-[40rem]:pr-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--website-primary)_18%,transparent)] text-[var(--website-primary)]">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{it.icon}</span>
            </span>
            <div className="min-w-0">
              <div className="break-words text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--website-muted)] @min-[40rem]:tracking-[0.2em]">{it.label}</div>
              <div className="mt-0.5 font-semibold leading-snug">{it.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function ConcertAbout({ event, section }: SectionProps) {
  const c = section?.content || {};
  const heading = str(c.heading) || 'About the show';
  const title = str(c.title) || `An unforgettable night of live music`;
  const body = str(c.description) || str(c.body) || str(event?.description);
  const paragraphs = (body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const highlights = [
    { icon: 'music_note', label: 'Live performance' },
    { icon: 'speaker', label: 'Concert-grade sound' },
    { icon: 'flare', label: 'Stage lights & visuals' },
  ];

  return (
    <section id="about" className="bg-[var(--website-background)] text-[var(--website-text)] website-section">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 @min-[40rem]:px-10 @min-[64rem]:grid-cols-12 @min-[64rem]:gap-16">
        <div className="space-y-4 @min-[64rem]:col-span-5">
          <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[var(--website-accent)]">{heading}</span>
          <h2 className="text-3xl font-black leading-tight tracking-tight @min-[48rem]:text-5xl">{title}</h2>
          <ul className="flex flex-wrap gap-2 pt-2">
            {highlights.map((h) => (
              <li key={h.label} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--website-border)] px-3 py-1.5 text-[13px] font-medium">
                <span className="material-symbols-outlined text-[16px] text-[var(--website-primary)]" aria-hidden="true">{h.icon}</span>
                {h.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-[var(--website-muted)] @min-[64rem]:col-span-7">
          {paragraphs.length > 0 ? paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>) : (
            <p>Join us for {event?.name ?? 'the show'}: an evening of music, lights and memories with fellow fans.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  on_sale: 'Book now',
  sold_out: 'Sold out',
  sales_ended: 'Sales closed',
  scheduled: 'Opens soon',
  inactive: 'Unavailable',
  draft: 'Unavailable',
};

/**
 * Ticket wall: each seating zone is a ticket stub with its price, what's left and its own "Book
 * now" that opens registration with that zone already chosen. Registration renders it once it
 * knows registration is open, and passes the tickets it already loaded.
 */
export function ConcertTickets({ event, section, tickets }: SectionProps & { tickets: PublicTicketAvailability[] | null }) {
  const c = section?.content || {};

  const heading = str(c.heading) || 'Tickets';
  const title = str(c.title) || 'Pick your spot';
  const description = str(c.subtitle) || 'Prices are per person. Your e-ticket with a QR code is emailed as soon as you book.';
  const list = (tickets || []).slice().sort((a, b) => a.price_amount - b.price_amount);
  const topPrice = list.length > 1 ? list[list.length - 1].price_amount : -1;

  return (
    <section id="registration" className="bg-[var(--website-surface)] text-[var(--website-text)] website-section border-y border-[var(--website-border)]">
      <div className="mx-auto max-w-7xl px-5 @min-[40rem]:px-10">
        <div className="mb-10 flex flex-col gap-3 @min-[64rem]:flex-row @min-[64rem]:items-end @min-[64rem]:justify-between">
          <div className="space-y-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[var(--website-accent)]">{heading}</span>
            <h2 className="text-3xl font-black tracking-tight @min-[48rem]:text-5xl">{title}</h2>
          </div>
          <p className="max-w-md text-[var(--website-muted)]">{description}</p>
        </div>

        {tickets === null ? (
          <div className="grid gap-4 @min-[48rem]:grid-cols-2 @min-[80rem]:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-[var(--website-background)]" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-[var(--website-border)] bg-[var(--website-background)] p-8" style={card}>
            <p className="text-lg font-semibold">Registrations are open.</p>
            <Link href={registerHref(event)} className={`${btn} bg-[var(--website-primary)] px-8 py-3.5 text-sm text-white hover:brightness-110`} style={radius}>
              {str(c.buttonText) || 'Book tickets'}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 @min-[48rem]:grid-cols-2 @min-[80rem]:grid-cols-3">
            {list.map((t) => {
              const available = t.status === 'on_sale';
              const premium = t.price_amount === topPrice;
              const fewLeft = available && t.quantity_remaining > 0 && t.quantity_remaining <= Math.max(10, Math.ceil(t.quantity_total * 0.1));
              return (
                <li key={t.id}>
                  <div
                    className={`group relative flex h-full overflow-hidden border bg-[var(--website-background)] transition-all ${available ? 'hover:-translate-y-0.5 hover:border-[var(--website-primary)]' : 'opacity-60'} ${premium ? 'border-[var(--website-accent)]' : 'border-[var(--website-border)]'}`}
                    style={card}
                  >
                    {/* Ticket stub: zone and details */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold leading-tight">{t.name}</h3>
                          {premium && (
                            <span className="rounded-full bg-[var(--website-accent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">Premium</span>
                          )}
                        </div>
                        {t.description && <p className="line-clamp-2 text-sm text-[var(--website-muted)]">{t.description}</p>}
                      </div>
                      <div className="text-[12px] font-semibold uppercase tracking-wider">
                        {fewLeft ? (
                          <span className="text-[var(--website-accent)]">Only {t.quantity_remaining} left</span>
                        ) : (
                          <span className="text-[var(--website-muted)]">{available ? 'Available' : STATUS_LABEL[t.status] ?? 'Unavailable'}</span>
                        )}
                      </div>
                    </div>

                    {/* Perforation */}
                    <div aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-[var(--website-border)]">
                      <span className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-[var(--website-surface)]" />
                      <span className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-[var(--website-surface)]" />
                    </div>

                    {/* Price and booking */}
                    <div className="flex w-36 shrink-0 flex-col items-center justify-center gap-3 p-4 text-center">
                      <div className="text-2xl font-black leading-none">{t.ticket_type === 'free' ? 'Free' : formatPaiseToINR(t.price_amount)}</div>
                      {available ? (
                        <Link
                          href={registerHref(event, t.id)}
                          className={`${btn} w-full bg-[var(--website-primary)] px-3 py-2.5 text-[12px] text-white hover:brightness-110`}
                          style={radius}
                          aria-label={`Book ${t.name}`}
                        >
                          Book now
                        </Link>
                      ) : (
                        <span className="w-full rounded border border-[var(--website-border)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--website-muted)]">
                          {STATUS_LABEL[t.status] ?? 'Unavailable'}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */

/**
 * Venue with a live Google Map beside it: a road map, or satellite imagery of the actual site.
 * Uses Google's keyless embed, searched by the venue text, so it needs no API key or coordinates.
 */
export function ConcertVenue({ event, section }: SectionProps) {
  const c = section?.content || {};
  // The organizer's photo of the building, uploaded in the editor. Google's own place photos need a paid Places API key.
  const photo = str(c.image);
  const [view, setView] = useState<'photo' | 'map' | 'satellite'>(photo ? 'photo' : 'map');
  const views = (photo ? ['photo', 'map', 'satellite'] : ['map', 'satellite']) as ('photo' | 'map' | 'satellite')[];
  const current = view === 'photo' && !photo ? 'map' : view;
  const venue = venueOf(event);
  const query = encodeURIComponent(str(c.mapQuery) || venue);
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + query;
  const openUrl = 'https://www.google.com/maps/search/?api=1&query=' + query;
  const embedUrl = 'https://www.google.com/maps?q=' + query + '&z=' + (current === 'satellite' ? 18 : 15) + (current === 'satellite' ? '&t=k' : '') + '&output=embed';
  const showMap = (c.showMap ?? true) && venue !== 'Online' && venue !== 'Venue to be announced';
  const date = showDate(event);
  const time = showTime(event);

  return (
    <section id="venue" className="bg-[var(--website-background)] text-[var(--website-text)] website-section">
      <div className="mx-auto max-w-7xl px-5 @min-[40rem]:px-10">
        <div className="overflow-hidden border border-[var(--website-border)] bg-[var(--website-surface)]" style={card}>
          <div className={'grid ' + (showMap ? '@min-[64rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : '')}>
            {/* Details */}
            <div className="flex flex-col justify-between gap-8 p-7 @min-[48rem]:p-10">
              <div className="space-y-4">
                <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[var(--website-accent)]">{str(c.heading) || 'The venue'}</span>
                <h2 className="text-3xl font-black leading-tight tracking-tight @min-[48rem]:text-4xl">{str(c.title) || venue}</h2>
                <p className="max-w-lg text-[var(--website-muted)]">
                  {str(c.description) || 'Arrive early: gates open before the show, and entry is by the QR code on your e-ticket.'}
                </p>
              </div>

              <div className="space-y-5">
                <dl className="space-y-3 text-sm">
                  {date && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] text-[var(--website-primary)]" aria-hidden="true">event</span>
                      <div>
                        <dt className="sr-only">When</dt>
                        <dd className="font-semibold">{date.full}</dd>
                        {time && <dd className="text-[var(--website-muted)]">{time}</dd>}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-[var(--website-primary)]" aria-hidden="true">location_on</span>
                    <div>
                      <dt className="sr-only">Where</dt>
                      <dd className="font-semibold">{venue}</dd>
                    </div>
                  </div>
                </dl>

                {showMap && (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btn + ' bg-[var(--website-primary)] px-6 py-3 text-[12px] text-white hover:brightness-110'}
                      style={radius}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">directions</span>
                      Get directions
                    </a>
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btn + ' border border-[var(--website-border)] bg-[var(--website-background)] px-6 py-3 text-[12px] hover:border-[var(--website-primary)]'}
                      style={radius}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Live map */}
            {showMap && (
              <div className="relative min-h-[320px] border-t border-[var(--website-border)] @min-[64rem]:min-h-[420px] @min-[64rem]:border-l @min-[64rem]:border-t-0">
                {current === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={venue} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <iframe
                    key={current}
                    title={'Map of ' + venue}
                    src={embedUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                )}
                <div className="absolute right-3 top-3 flex rounded-full border border-black/10 bg-white/95 p-1 text-[12px] font-bold text-neutral-800 shadow-lg" role="group" aria-label="Map view">
                  {views.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      aria-pressed={current === v}
                      className={'rounded-full px-3.5 py-1.5 capitalize transition-colors ' + (current === v ?'bg-neutral-900 text-white' : 'hover:bg-neutral-100')}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function ConcertFinalCTA({ event, section }: SectionProps) {
  const c = section?.content || {};
  const title = str(c.title) || "Don't miss the show";
  const date = showDate(event);
  return (
    <section className="relative isolate overflow-hidden bg-[var(--website-primary)] text-white website-section">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40" style={{ background: 'radial-gradient(60% 80% at 80% 0%, var(--website-accent), transparent 70%)' }} />
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 text-center @min-[40rem]:px-10">
        <h2 className="text-4xl font-black uppercase tracking-tight @min-[48rem]:text-6xl">{title}</h2>
        <p className="max-w-2xl text-lg text-white/85">
          {event?.name}
          {date ? ` · ${date.full}` : ''} · {venueOf(event)}
        </p>
        {(c.showPrimaryCta ?? true) && (
          <Link href={str(c.primaryCtaDest) || registerHref(event)} className={`${btn} bg-white px-10 py-4 text-sm text-[var(--website-primary)] shadow-xl hover:bg-white/90`} style={radius}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">confirmation_number</span>
            {str(c.primaryCtaText) || 'Book tickets'}
          </Link>
        )}
      </div>
    </section>
  );
}
