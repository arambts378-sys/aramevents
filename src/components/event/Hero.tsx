'use client';

import React from 'react';
import Link from 'next/link';
import { WebsiteSection } from '@/types';
import { HeroVariant } from '@/data/templates';

interface HeroProps {
  event: any;
  section?: WebsiteSection;
  variant?: HeroVariant;
}

export default function Hero({ event, section, variant = 'centered' }: HeroProps) {
  const content = section?.content || {};
  const hasFlyer = !!content.image;

  const showTitle = content.showTitle ?? true;
  const showDate = content.showDate ?? true;
  const showLocation = content.showLocation ?? true;
  const showDescription = content.showDescription ?? true;

  const showPrimaryCta = content.showPrimaryCta ?? true;
  const primaryCtaText = (content.primaryCtaText as string) || 'Register Now';
  const primaryCtaDest =
    (content.primaryCtaDest as string) ||
    `/events/${event?.slug || event?.id}/register`;

  const showSecondaryCta = content.showSecondaryCta ?? false;
  const secondaryCtaText = (content.secondaryCtaText as string) || 'View Agenda';
  const secondaryCtaDest = (content.secondaryCtaDest as string) || '#agenda';

  const flyerImage = (content.image as string) || event?.flyer;
  const eventName = event?.name || 'Upcoming Event';
  const eventDate = event?.date || event?.startDate || 'Date to be announced';
  const eventLocation = event?.venue || event?.location || 'Venue to be announced';
  const eventDescription =
    event?.description ||
    'Join leaders, innovators, and participants for an extraordinary event experience.';

  // =========================================================================
  // 1. ASYMMETRIC VARIANT (Editorial)
  // Large editorial title, separate metadata column, off-center image frame
  // =========================================================================
  if (variant === 'asymmetric') {
    return (
      <section className="relative w-full min-h-[85vh] flex flex-col justify-between py-16 lg:py-24 px-6 sm:px-10 lg:px-16 overflow-hidden border-b border-[var(--website-border)] bg-[var(--website-background)]">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-between">
          {/* Eyebrow & Issue / Edition metadata */}
          <div className="flex items-center justify-between pb-6 border-b border-[var(--website-border)] text-xs font-mono uppercase tracking-widest text-[var(--website-muted)]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--website-primary)] animate-pulse" />
              <span>Thought Leadership · Editorial Edition</span>
            </span>
            <span>{eventDate}</span>
          </div>

          {/* Main Asymmetric Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center py-12">
            {/* Left Column (7 cols): Giant Editorial Headline & Essay intro */}
            <div className="lg:col-span-7 space-y-6">
              {showTitle && (
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-[var(--website-text)]">
                  {eventName}
                </h1>
              )}

              {showDescription && (
                <p className="text-lg sm:text-xl text-[var(--website-muted)] leading-relaxed max-w-2xl font-light">
                  {eventDescription}
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                {showPrimaryCta && (
                  <Link
                    href={primaryCtaDest}
                    className="px-7 py-3.5 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-md"
                    style={{ borderRadius: 'var(--website-button-radius)' }}
                  >
                    {primaryCtaText}
                  </Link>
                )}
                {showSecondaryCta && (
                  <Link
                    href={secondaryCtaDest}
                    className="px-6 py-3 text-sm font-medium border border-[var(--website-border)] text-[var(--website-text)] hover:bg-[var(--website-surface)] transition-all"
                    style={{ borderRadius: 'var(--website-button-radius)' }}
                  >
                    {secondaryCtaText}
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Asymmetric Image Frame or Architectural Card */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-[var(--website-border)] shadow-xl bg-[var(--website-surface)]">
                {flyerImage ? (
                  <img
                    src={flyerImage}
                    alt={eventName}
                    className="w-full h-full object-cover filter contrast-[1.05]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-end p-8 bg-gradient-to-t from-[var(--website-text)]/20 via-transparent to-transparent">
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--website-primary)]">
                        Location &amp; Gathering
                      </span>
                      <h4 className="text-2xl font-semibold text-[var(--website-text)]">
                        {eventLocation}
                      </h4>
                      <p className="text-xs text-[var(--website-muted)]">
                        Curated in-person symposium and dialogue.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Editorial Metadata Strip */}
          {(showDate || showLocation) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[var(--website-border)] text-sm">
              <div>
                <span className="text-[11px] font-mono uppercase text-[var(--website-muted)] block">Date</span>
                <span className="font-semibold text-[var(--website-text)]">{eventDate}</span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-[var(--website-muted)] block">Location</span>
                <span className="font-semibold text-[var(--website-text)]">{eventLocation}</span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-[var(--website-muted)] block">Format</span>
                <span className="font-semibold text-[var(--website-text)]">{event.format || 'In-Person'}</span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-[var(--website-muted)] block">Access</span>
                <span className="font-semibold text-[var(--website-text)]">Registration Required</span>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 2. SPLIT VARIANT (Executive & Corporate)
  // Executive split screen: left enterprise statement & CTA, right dark executive visual
  // =========================================================================
  if (variant === 'split') {
    return (
      <section className="relative w-full min-h-[85vh] flex flex-col lg:flex-row bg-[var(--website-background)] text-[var(--website-text)] overflow-hidden border-b border-[var(--website-border)]">
        {/* Left Side: Enterprise Leadership Panel */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-16 lg:py-24 z-10">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--website-border)] bg-[var(--website-surface)] text-xs font-mono font-medium text-[var(--website-primary)] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[var(--website-primary)]" />
              <span>Executive Summit</span>
            </div>

            {showTitle && (
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                {eventName}
              </h1>
            )}

            {showDescription && (
              <p className="text-base sm:text-lg text-[var(--website-muted)] leading-relaxed">
                {eventDescription}
              </p>
            )}

            {(showDate || showLocation) && (
              <div className="flex flex-wrap items-center gap-6 pt-2 text-sm font-medium text-[var(--website-text)]">
                {showDate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--website-primary)]">
                      calendar_today
                    </span>
                    <span>{eventDate}</span>
                  </div>
                )}
                {showLocation && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--website-primary)]">
                      location_on
                    </span>
                    <span>{eventLocation}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center gap-4">
              {showPrimaryCta && (
                <Link
                  href={primaryCtaDest}
                  className="px-7 py-3.5 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-md"
                  style={{ borderRadius: 'var(--website-button-radius)' }}
                >
                  {primaryCtaText}
                </Link>
              )}
              {showSecondaryCta && (
                <Link
                  href={secondaryCtaDest}
                  className="px-6 py-3.5 text-sm font-semibold border border-[var(--website-border)] bg-[var(--website-surface)] hover:bg-[var(--website-surface)]/80 transition-all"
                  style={{ borderRadius: 'var(--website-button-radius)' }}
                >
                  {secondaryCtaText}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Media Frame or Visual Pillar */}
        <div className="w-full lg:w-5/12 relative min-h-[360px] lg:min-h-full bg-[var(--website-surface)] border-t lg:border-t-0 lg:border-l border-[var(--website-border)] flex items-center justify-center p-8 overflow-hidden">
          {flyerImage ? (
            <img
              src={flyerImage}
              alt={eventName}
              className="w-full h-full max-h-[600px] object-cover rounded-xl shadow-2xl border border-[var(--website-border)]"
            />
          ) : (
            <div className="w-full max-w-sm p-8 rounded-2xl border border-[var(--website-border)] bg-[var(--website-background)] shadow-lg space-y-4">
              <span className="text-[11px] font-mono tracking-widest text-[var(--website-primary)] uppercase font-semibold">
                Strategic Briefing
              </span>
              <h3 className="text-xl font-bold">{eventName}</h3>
              <p className="text-sm text-[var(--website-muted)] leading-relaxed">
                Convening key decision makers, C-suite executives, and governance partners.
              </p>
              <div className="pt-2 border-t border-[var(--website-border)] flex items-center justify-between text-xs font-mono text-[var(--website-muted)]">
                <span>Location: {eventLocation}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 3. FULL-BLEED VARIANT (Creative)
  // High-contrast, oversized typography, vibrant pill badges, experimental offset
  // =========================================================================
  if (variant === 'full-bleed') {
    return (
      <section className="relative w-full min-h-[90vh] flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-20 bg-[var(--website-background)] text-[var(--website-text)] overflow-hidden border-b border-[var(--website-border)]">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--website-primary)] opacity-15 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[var(--website-primary)] text-white shadow-xs">
              Live Experience
            </span>
            <span className="px-3.5 py-1 rounded-full text-xs font-mono border border-[var(--website-border)] text-[var(--website-muted)]">
              {eventDate}
            </span>
          </div>

          {showTitle && (
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.98] uppercase">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-xl sm:text-2xl text-[var(--website-muted)] max-w-3xl leading-relaxed font-light">
              {eventDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-5 pt-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-8 py-4 text-base font-bold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-xl active:scale-95"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
            {showSecondaryCta && (
              <Link
                href={secondaryCtaDest}
                className="px-8 py-4 text-base font-semibold border-2 border-[var(--website-text)] text-[var(--website-text)] hover:bg-[var(--website-surface)] transition-all"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 4. STATS-DRIVEN VARIANT (Sports)
  // Athletic, high-velocity headline, numerical metrics strip right in the hero
  // =========================================================================
  if (variant === 'stats-driven') {
    return (
      <section className="relative w-full min-h-[85vh] flex flex-col justify-between py-14 px-6 sm:px-12 lg:px-20 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)]">
        <div className="max-w-7xl mx-auto w-full my-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[var(--website-primary)] text-white font-mono text-xs font-black uppercase tracking-widest rounded-sm">
            <span className="material-symbols-outlined text-[15px]">sports_score</span>
            <span>Official Championship &amp; Race</span>
          </div>

          {showTitle && (
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.95]">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-lg sm:text-xl text-[var(--website-muted)] max-w-3xl leading-relaxed">
              {eventDescription}
            </p>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-8 py-4 text-base font-black text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-lg uppercase tracking-wider rounded-sm"
              >
                {primaryCtaText}
              </Link>
            )}
            {showSecondaryCta && (
              <Link
                href={secondaryCtaDest}
                className="px-7 py-4 text-base font-bold border-2 border-[var(--website-border)] hover:bg-[var(--website-surface)] transition-all uppercase tracking-wider rounded-sm"
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>

          {/* Athletic Numerical Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t-2 border-[var(--website-text)]/10">
            <div className="p-4 bg-[var(--website-surface)] border border-[var(--website-border)] rounded-md">
              <span className="text-[10px] font-mono uppercase text-[var(--website-muted)] block tracking-wider">Race Day</span>
              <span className="text-xl sm:text-2xl font-black font-space">{eventDate}</span>
            </div>
            <div className="p-4 bg-[var(--website-surface)] border border-[var(--website-border)] rounded-md">
              <span className="text-[10px] font-mono uppercase text-[var(--website-muted)] block tracking-wider">Start Line</span>
              <span className="text-xl sm:text-2xl font-black font-space truncate block">{eventLocation}</span>
            </div>
            <div className="p-4 bg-[var(--website-surface)] border border-[var(--website-border)] rounded-md">
              <span className="text-[10px] font-mono uppercase text-[var(--website-muted)] block tracking-wider">Timing</span>
              <span className="text-xl sm:text-2xl font-black font-space">RFID Chip Bib</span>
            </div>
            <div className="p-4 bg-[var(--website-surface)] border border-[var(--website-border)] rounded-md">
              <span className="text-[10px] font-mono uppercase text-[var(--website-muted)] block tracking-wider">Awards</span>
              <span className="text-xl sm:text-2xl font-black font-space">Medal &amp; Certificate</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 5. POSTER VARIANT (Festival)
  // Bold full-screen poster composition, massive title, experience tags
  // =========================================================================
  if (variant === 'poster') {
    return (
      <section className="relative w-full min-h-[90vh] flex flex-col justify-center items-center text-center py-20 px-6 sm:px-12 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)] overflow-hidden">
        <div className="max-w-5xl mx-auto w-full space-y-6 relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full border-2 border-[var(--website-primary)] text-xs font-mono font-bold uppercase tracking-widest text-[var(--website-primary)]">
            ★ Annual Festival &amp; Celebration ★
          </div>

          {showTitle && (
            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black tracking-tight leading-[0.95] uppercase">
              {eventName}
            </h1>
          )}

          {(showDate || showLocation) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-base sm:text-lg font-mono font-bold text-[var(--website-primary)]">
              <span>{eventDate}</span>
              <span>•</span>
              <span>{eventLocation}</span>
            </div>
          )}

          {showDescription && (
            <p className="text-lg sm:text-xl text-[var(--website-muted)] max-w-2xl mx-auto leading-relaxed">
              {eventDescription}
            </p>
          )}

          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-10 py-4 text-base font-bold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-xl active:scale-95 uppercase tracking-wider"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
            {showSecondaryCta && (
              <Link
                href={secondaryCtaDest}
                className="px-8 py-4 text-base font-semibold border-2 border-[var(--website-border)] bg-[var(--website-surface)] hover:bg-[var(--website-surface)]/80 transition-all"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 6. OUTCOME-FOCUSED VARIANT (Workshop)
  // Compact learning-first hero with skill tags and seat reservation badge
  // =========================================================================
  if (variant === 'outcome-focused') {
    return (
      <section className="relative w-full min-h-[75vh] flex flex-col justify-center py-16 px-6 sm:px-12 lg:px-20 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)]">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded bg-[var(--website-primary)] text-white font-bold uppercase tracking-wider">
              Hands-On Workshop
            </span>
            <span className="px-3 py-1 rounded border border-[var(--website-border)] bg-[var(--website-surface)] text-[var(--website-muted)] font-medium">
              Interactive Masterclass
            </span>
          </div>

          {showTitle && (
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-base sm:text-lg text-[var(--website-muted)] leading-relaxed">
              {eventDescription}
            </p>
          )}

          {/* Practical details pill row */}
          <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-[var(--website-surface)] border border-[var(--website-border)] text-sm">
            <div>
              <span className="text-[11px] font-mono text-[var(--website-muted)] block uppercase">Schedule</span>
              <span className="font-semibold">{eventDate}</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[var(--website-muted)] block uppercase">Location</span>
              <span className="font-semibold">{eventLocation}</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-[var(--website-muted)] block uppercase">Capacity</span>
              <span className="font-semibold">Limited Seats Available</span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-7 py-3.5 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-md"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
            {showSecondaryCta && (
              <Link
                href={secondaryCtaDest}
                className="px-6 py-3.5 text-sm font-semibold border border-[var(--website-border)] text-[var(--website-text)] hover:bg-[var(--website-surface)] transition-all"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 7. CINEMATIC VARIANT (Summit)
  // Dark luxury backdrop with gold/amber badge and generous breathing room
  // =========================================================================
  if (variant === 'cinematic') {
    return (
      <section className="relative w-full min-h-[90vh] flex flex-col justify-center items-center text-center py-24 px-6 sm:px-12 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)] overflow-hidden">
        <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--website-accent)]/40 bg-[var(--website-surface)] text-xs font-mono tracking-widest uppercase text-[var(--website-accent)] font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[var(--website-accent)] animate-pulse" />
            <span>Global Leadership Summit</span>
          </div>

          {showTitle && (
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.08]">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-lg sm:text-xl text-[var(--website-muted)] max-w-2xl mx-auto leading-relaxed font-light">
              {eventDescription}
            </p>
          )}

          {(showDate || showLocation) && (
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-mono text-[var(--website-muted)]">
              <span>{eventDate}</span>
              <span>—</span>
              <span>{eventLocation}</span>
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-8 py-4 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-xl"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 8. STORY-LED VARIANT (Community & Networking)
  // Human-centered conversation headline with social badges
  // =========================================================================
  if (variant === 'story-led') {
    return (
      <section className="relative w-full min-h-[80vh] flex flex-col justify-center py-16 px-6 sm:px-12 lg:px-20 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)]">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--website-primary)] font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Community Gathering &amp; Networking</span>
          </div>

          {showTitle && (
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-lg sm:text-xl text-[var(--website-muted)] leading-relaxed">
              {eventDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--website-text)] pt-2">
            <span className="font-semibold">{eventDate}</span>
            <span>•</span>
            <span className="font-semibold">{eventLocation}</span>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-8 py-3.5 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-md"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
            {showSecondaryCta && (
              <Link
                href={secondaryCtaDest}
                className="px-6 py-3.5 text-sm font-semibold border border-[var(--website-border)] bg-[var(--website-surface)] hover:bg-[var(--website-surface)]/80 transition-all"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 9. MINIMAL VARIANT (Wellness)
  // Calming, gentle typography and spacious breathing room
  // =========================================================================
  if (variant === 'minimal') {
    return (
      <section className="relative w-full min-h-[80vh] flex flex-col justify-center items-center text-center py-20 px-6 sm:px-12 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)]">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--website-muted)]">
            Restorative Experience · Sanctuary Retreat
          </span>

          {showTitle && (
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-normal leading-tight">
              {eventName}
            </h1>
          )}

          {showDescription && (
            <p className="text-base sm:text-lg text-[var(--website-muted)] font-light leading-relaxed max-w-2xl mx-auto">
              {eventDescription}
            </p>
          )}

          <div className="text-sm font-mono text-[var(--website-muted)] pt-2">
            <span>{eventDate}</span>
            <span className="mx-2">·</span>
            <span>{eventLocation}</span>
          </div>

          <div className="pt-4">
            {showPrimaryCta && (
              <Link
                href={primaryCtaDest}
                className="px-8 py-3.5 text-sm font-medium text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-sm"
                style={{ borderRadius: 'var(--website-button-radius)' }}
              >
                {primaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 10. CENTERED VARIANT (Conference - Default fallback)
  // Grand centered conference hero with centered badge and balanced CTAs
  // =========================================================================
  return (
    <section className="relative w-full min-h-[80vh] flex flex-col justify-center items-center text-center py-20 px-6 sm:px-12 bg-[var(--website-background)] text-[var(--website-text)] border-b border-[var(--website-border)]">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--website-border)] bg-[var(--website-surface)] text-xs font-mono font-medium text-[var(--website-primary)] uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[var(--website-primary)] animate-pulse" />
          <span>Annual Conference</span>
        </div>

        {showTitle && (
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
            {eventName}
          </h1>
        )}

        {(showDate || showLocation) && (
          <div className="flex flex-wrap items-center justify-center gap-6 text-base font-medium text-[var(--website-muted)]">
            {showDate && <span>{eventDate}</span>}
            {showDate && showLocation && <span>•</span>}
            {showLocation && <span>{eventLocation}</span>}
          </div>
        )}

        {showDescription && (
          <p className="text-lg text-[var(--website-muted)] max-w-2xl mx-auto leading-relaxed">
            {eventDescription}
          </p>
        )}

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          {showPrimaryCta && (
            <Link
              href={primaryCtaDest}
              className="px-8 py-3.5 text-sm font-semibold text-white bg-[var(--website-primary)] hover:opacity-90 transition-all shadow-md"
              style={{ borderRadius: 'var(--website-button-radius)' }}
            >
              {primaryCtaText}
            </Link>
          )}
          {showSecondaryCta && (
            <Link
              href={secondaryCtaDest}
              className="px-7 py-3.5 text-sm font-semibold border border-[var(--website-border)] bg-[var(--website-surface)] hover:bg-[var(--website-surface)]/80 transition-all"
              style={{ borderRadius: 'var(--website-button-radius)' }}
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
