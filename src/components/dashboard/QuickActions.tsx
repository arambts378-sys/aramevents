import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
        QUICK ACTIONS
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Shortcut 1: Create Event */}
        <Link
          href="/app/events/new"
          className="bg-[#F6F1FF] hover:bg-[#7C5CFC] text-[#7C5CFC] hover:text-white border border-[#7C5CFC]/20 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-white group-hover:bg-white/20 flex items-center justify-center text-[#7C5CFC] group-hover:text-white shrink-0 transition-colors shadow-xs">
            <span className="material-symbols-outlined text-[18px]" data-icon="add_circle">
              add_circle
            </span>
          </div>
          <span className="text-[14px] font-bold leading-tight font-jakarta">Create Event</span>
        </Link>

        {/* Shortcut 2: Manage Events */}
        <Link
          href="/app/events"
          className="bg-white hover:bg-[#F6F1FF] border border-[#E6E2F0] rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group hover:border-[#7C5CFC]/40"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC] shrink-0">
            <span className="material-symbols-outlined text-[18px]" data-icon="event_note">
              event_note
            </span>
          </div>
          <span className="text-[14px] font-bold text-[#17152B] group-hover:text-[#7C5CFC] leading-tight transition-colors font-jakarta">
            Manage Events
          </span>
        </Link>

        {/* Shortcut 3: People */}
        <Link
          href="/app/people"
          className="bg-white hover:bg-[#F6F1FF] border border-[#E6E2F0] rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group hover:border-[#7C5CFC]/40"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC] shrink-0">
            <span className="material-symbols-outlined text-[18px]" data-icon="badge">
              badge
            </span>
          </div>
          <span className="text-[14px] font-bold text-[#17152B] group-hover:text-[#7C5CFC] leading-tight transition-colors font-jakarta">
            People
          </span>
        </Link>

        {/* Shortcut 4: Analytics */}
        <Link
          href="/app/analytics"
          className="bg-white hover:bg-[#F6F1FF] border border-[#E6E2F0] rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group hover:border-[#7C5CFC]/40"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC] shrink-0">
            <span className="material-symbols-outlined text-[18px]" data-icon="insights">
              insights
            </span>
          </div>
          <span className="text-[14px] font-bold text-[#17152B] group-hover:text-[#7C5CFC] leading-tight transition-colors font-jakarta">
            Analytics
          </span>
        </Link>
      </div>
    </section>
  );
}
