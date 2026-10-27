'use client';

import React from 'react';
import Link from 'next/link';

interface EventsHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function EventsHeader({ onOpenMobileMenu }: EventsHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ds-line pb-6 mb-8">
      <div>
        <div className="flex items-center justify-between md:block">
          <span className="text-[12px] font-bold tracking-wider text-ds-accent uppercase block mb-1">
            PORTFOLIO
          </span>
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-lg shadow-xs"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
              <span>Menu</span>
            </button>
          )}
        </div>
        <h1 className="text-[32px] md:text-[36px] font-bold text-ds-ink tracking-tight leading-tight font-space">
          Events
        </h1>
        <p className="text-[14px] text-ds-muted mt-1 font-jakarta">
          Manage your full event portfolio across all operations.
        </p>
      </div>

      {/* Header Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/app/events/new"
          className="h-[44px] px-5 bg-ds-accent hover:bg-ds-accent-strong text-white text-[14px] font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="add">
            add
          </span>
          <span>Create Event</span>
        </Link>
      </div>
    </header>
  );
}
