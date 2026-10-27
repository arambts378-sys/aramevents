'use client';

import React from 'react';
import Link from 'next/link';

interface VolunteerAccessCardProps {
  eventId: string;
}

export function VolunteerAccessCard({ eventId }: VolunteerAccessCardProps) {
  return (
    <section className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
      {/* Subtle corner violet accent glow */}

      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent flex-shrink-0">
          <span className="material-symbols-outlined text-[26px]">badge</span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-space text-[18px] text-ds-ink font-bold">
              VOLUNTEER ACCESS
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-ds-accent-soft text-ds-accent-strong text-[10px] font-mono uppercase font-bold tracking-wider">
              Device Control
            </span>
          </div>
          <p className="font-jakarta text-[14px] text-ds-muted mt-0.5 max-w-xl">
            Manage event volunteers and assign the scanner zones they are allowed to access.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10 shrink-0">
        <Link
          href={`/app/events/${eventId}/operations/volunteers`}
          className="px-5 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-jakarta text-[13px] font-semibold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap active:scale-[0.98]"
        >
          <span>Manage Volunteers</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
