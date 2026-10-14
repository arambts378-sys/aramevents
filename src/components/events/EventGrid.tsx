'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';

interface EventGridProps {
  events: Event[];
}

function EventImageWithFallback({
  src,
  alt,
  format,
  name,
}: {
  src?: string | null;
  alt: string;
  format?: string;
  name: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className="w-full h-full bg-[#F6F1FF] flex flex-col items-center justify-center p-4 relative group-hover:scale-[1.01] transition-transform duration-300">
        <div className="w-10 h-10 rounded-lg bg-white shadow-xs flex items-center justify-center text-[#7C5CFC] mb-2 border border-[#E6E2F0]">
          <span className="material-symbols-outlined text-[22px]">event</span>
        </div>
        <span className="text-[11px] font-bold text-[#7C5CFC] tracking-wider uppercase font-space">
          {format || 'ARAM BTS'}
        </span>
        <span className="text-[11px] text-[#77738A] truncate max-w-[180px] text-center mt-0.5 font-jakarta">
          {name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
    />
  );
}

export function EventGrid({ events }: EventGridProps) {
  if (events.length === 0) return null;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBA';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render status badge using existing supported statuses
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'draft').toLowerCase().trim();
    if (s === 'draft') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-white/95 border border-[#E6E2F0] text-[11px] text-[#77738A] uppercase font-bold tracking-wider">
          Draft
        </span>
      );
    }
    if (s === 'published' || s === 'upcoming') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-[#7C5CFC] text-white text-[11px] uppercase font-bold tracking-wider shadow-xs">
          {s.toUpperCase()}
        </span>
      );
    }
    if (s === 'completed' || s === 'live' || s === 'active') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#16A34A] text-[11px] uppercase font-bold tracking-wider">
          {s.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-[#F6F1FF] border border-[#E6E2F0] text-[#77738A] text-[11px] uppercase font-bold tracking-wider">
        {s.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        return (
          <div
            key={event.id}
            className="bg-white rounded-xl border border-[#E6E2F0] overflow-hidden shadow-xs hover:shadow-md hover:border-[#7C5CFC]/40 transition-all flex flex-col h-full group"
          >
            {/* 1. Event Image / Flyer with Status Badge */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#F6F1FF]">
              <EventImageWithFallback
                src={event.flyer}
                alt={event.name}
                format={event.format || event.type}
                name={event.name}
              />

              {/* Status Badge */}
              <div className="absolute top-3 right-3 z-10">
                {renderStatusBadge(event.status)}
              </div>
            </div>

            {/* 2. Content Body */}
            <div className="p-5 flex flex-col flex-1 justify-between">
              <div>
                {/* Event Type */}
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] mb-1.5 font-jakarta">
                  {event.type || event.format || 'EVENT'}
                </div>

                {/* Event Name */}
                <Link
                  href={`/app/events/${event.id}`}
                  className="text-[18px] md:text-[20px] font-bold text-[#17152B] font-space group-hover:text-[#7C5CFC] transition-colors line-clamp-2 leading-snug mb-3 block"
                >
                  {event.name}
                </Link>

                {/* Metadata: Date & Location */}
                <div className="space-y-1.5 text-[13px] text-[#77738A] font-jakarta mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[16px] text-[#77738A] shrink-0"
                      data-icon="calendar_today"
                    >
                      calendar_today
                    </span>
                    <span className="truncate">{formatDate(event.startDate)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[16px] text-[#77738A] shrink-0"
                      data-icon="location_on"
                    >
                      location_on
                    </span>
                    <span className="truncate">{event.location || 'Location TBA'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Card Footer Action */}
              <div className="pt-4 border-t border-[#E6E2F0] flex items-center justify-end">
                <Link
                  href={`/app/events/${event.id}`}
                  className="h-[36px] px-3.5 rounded-lg bg-[#F6F1FF] text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white text-[13px] font-bold group-hover:shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <span>Open Workspace</span>
                  <span
                    className="material-symbols-outlined text-[15px]"
                    data-icon="arrow_forward"
                  >
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
