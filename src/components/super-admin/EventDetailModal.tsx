'use client';

import React from 'react';
import Link from 'next/link';
import type { PlatformEventItem } from '@/lib/super-admin/types';

interface EventDetailModalProps {
  event: PlatformEventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
}: EventDetailModalProps) {
  if (!isOpen || !event) return null;

  const formatDate = (val: string) => {
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? '—'
      : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-ds-line max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-ds-line pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ds-accent text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">event</span>
            </div>
            <div>
              <h2 id="event-detail-title" className="font-space text-lg font-bold text-ds-ink">
                {event.name}
              </h2>
              <p className="text-xs text-ds-muted">ID: {event.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ds-muted hover:text-ds-ink p-1"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-ds-subtle border border-ds-line space-y-2">
            <p className="font-bold text-ds-accent uppercase tracking-wider text-[10px]">
              Lifecycle & Moderation
            </p>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Status:</span>
              <span className="font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-ds-line">
                {event.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Moderation:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase ${
                  event.moderationStatus === 'suspended'
                    ? 'bg-[#FFDAD6] text-ds-danger'
                    : event.moderationStatus === 'flagged'
                    ? 'bg-[#FEF3C7] text-[#B45309]'
                    : 'bg-[#DCFCE7] text-[#15803D]'
                }`}
              >
                {event.moderationStatus}
              </span>
            </div>
            {event.moderationReason && (
              <div className="mt-1 pt-1 border-t border-ds-line">
                <span className="text-ds-muted block">Reason:</span>
                <span className="text-ds-ink italic">{event.moderationReason}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-ds-subtle border border-ds-line space-y-2">
            <p className="font-bold text-ds-accent uppercase tracking-wider text-[10px]">
              Workspace & Organizer
            </p>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Workspace:</span>
              <span className="font-semibold text-ds-ink">{event.workspaceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Organizer:</span>
              <span className="text-ds-ink">{event.organizerName || event.organizerEmail || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Workspace Status:</span>
              <span>{event.workspaceIsSuspended ? 'Suspended' : 'Active'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ds-subtle border border-ds-line space-y-2">
            <p className="font-bold text-ds-accent uppercase tracking-wider text-[10px]">
              Event Schedule & Venue
            </p>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Dates:</span>
              <span className="text-ds-ink font-medium">
                {event.startDate} to {event.endDate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Time:</span>
              <span className="text-ds-ink">
                {event.startTime} - {event.endTime} ({event.timezone})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Venue:</span>
              <span className="text-ds-ink truncate max-w-[180px]">
                {event.location || 'Online / Not set'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ds-subtle border border-ds-line space-y-2">
            <p className="font-bold text-ds-accent uppercase tracking-wider text-[10px]">
              Registration & Performance
            </p>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Total Registrations:</span>
              <span className="font-space font-bold text-sm text-ds-ink">
                {event.registrationCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Format / Type:</span>
              <span className="text-ds-ink capitalize">
                {event.format} · {event.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-muted">Created:</span>
              <span className="text-ds-muted">{formatDate(event.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-ds-line flex items-center justify-between">
          <Link
            href={`/app/events/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ds-accent hover:underline"
          >
            <span>Inspect Organizer Workspace</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-ds-accent-soft text-ds-ink hover:bg-ds-subtle"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
