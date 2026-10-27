'use client';

import React from 'react';
import Link from 'next/link';

interface WorkspaceHeaderProps {
  currentUser?: {
    name?: string;
  } | null;
  onOpenMobileMenu?: () => void;
}

export function WorkspaceHeader({ currentUser, onOpenMobileMenu }: WorkspaceHeaderProps) {
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'there';

  // Subtle time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = getGreeting();

  return (
    <header className="flex flex-col gap-4 border-b border-ds-line/80 pb-5 sm:pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 md:block">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="ds-btn ds-btn-secondary ds-btn-sm md:hidden"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">menu</span>
              Menu
            </button>
          )}
        </div>
        <h1 className="mt-1 font-space text-[26px] font-bold leading-tight tracking-tight text-ds-ink sm:text-[32px]">
          {greeting},{' '}
          <span className="bg-ds-accent bg-clip-text text-transparent">
            {firstName}
          </span>
        </h1>
        <p className="mt-1 text-sm text-ds-muted">
          Manage your events, live turnstile check-ins, and audience telemetry from one place.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <Link href="/app/events" className="ds-btn ds-btn-secondary">
          <span className="material-symbols-outlined text-[18px] text-ds-muted" aria-hidden="true">visibility</span>
          <span>View Events</span>
        </Link>
        <Link href="/app/events/new" className="ds-btn ds-btn-primary shadow-sm shadow-sm">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
          <span>Create Event</span>
        </Link>
      </div>
    </header>
  );
}
