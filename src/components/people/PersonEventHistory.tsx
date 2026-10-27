'use client';

import React from 'react';
import Link from 'next/link';
import { PersonEventParticipation } from '@/services/peopleService';

interface PersonEventHistoryProps {
  eventHistory: PersonEventParticipation[];
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function PersonEventHistory({ eventHistory }: PersonEventHistoryProps) {
  if (eventHistory.length === 0) {
    return (
      <div className="bg-white border border-ds-line rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-ds-subtle text-ds-muted mx-auto flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[24px]">event_busy</span>
        </div>
        <h3 className="text-sm font-bold text-ds-ink">No Event Participation</h3>
        <p className="text-xs text-ds-muted mt-1 max-w-sm mx-auto">
          This person is not currently linked to any events or registrations in this workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-ds-line flex items-center justify-between bg-ds-subtle">
        <div>
          <h2 className="text-sm font-bold text-ds-ink tracking-tight">
            Event History & Participation
          </h2>
          <p className="text-xs text-ds-muted mt-0.5">
            Real event registrations and checkpoint attendance records.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ds-accent/10 text-ds-accent border border-ds-accent/20">
          {eventHistory.length} {eventHistory.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      <div className="divide-y divide-ds-line">
        {eventHistory.map((item) => (
          <div key={item.eventId} className="p-5 flex flex-col gap-4">
            {/* Top Event Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/events/${item.eventId}`}
                    className="font-bold text-ds-ink hover:text-ds-accent transition-colors text-sm sm:text-base flex items-center gap-1.5 group"
                  >
                    <span>{item.eventName}</span>
                    <span className="material-symbols-outlined text-[16px] text-ds-muted group-hover:text-ds-accent transition-colors">
                      open_in_new
                    </span>
                  </Link>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-ds-subtle text-ds-muted border border-ds-line">
                    {item.personType}
                  </span>
                </div>
                <div className="text-xs text-ds-muted mt-0.5 flex items-center gap-2">
                  <span>Event Date: {formatDate(item.eventStartDate)}</span>
                  {item.registeredAt && (
                    <>
                      <span>•</span>
                      <span>Registered: {formatDate(item.registeredAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Status Badge */}
              <div className="shrink-0">
                {item.hasAttended ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Attended ({item.checkInCount} {item.checkInCount === 1 ? 'scan' : 'scans'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-50 text-ds-muted border border-ds-line">
                    <span className="w-2 h-2 rounded-full bg-ds-muted"></span>
                    Not Attended
                  </span>
                )}
              </div>
            </div>

            {/* Registration Details Sub-Card */}
            <div className="bg-ds-subtle border border-ds-line/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[11px] font-medium text-ds-muted block">
                    Registration No:
                  </span>
                  <span className="font-mono font-bold text-ds-ink">
                    {item.registrationNumber || 'Not Registered'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-ds-muted block">
                    Ticket Status:
                  </span>
                  <span
                    className={`font-semibold ${
                      item.registrationStatus?.toLowerCase() === 'confirmed'
                        ? 'text-emerald-700'
                        : item.registrationStatus?.toLowerCase() === 'pending'
                        ? 'text-amber-700'
                        : 'text-ds-muted'
                    }`}
                  >
                    {item.registrationStatus || item.personStatus}
                  </span>
                </div>
              </div>

              {item.firstCheckInAt && (
                <div className="text-right">
                  <span className="text-[11px] font-medium text-ds-muted block">
                    First Check-In:
                  </span>
                  <span className="font-semibold text-ds-ink">
                    {formatDate(item.firstCheckInAt)} {formatTime(item.firstCheckInAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Check-in Scans Log (if scans exist) */}
            {item.checkIns.length > 0 && (
              <div className="pl-2 border-l-2 border-ds-accent/30 flex flex-col gap-1.5 text-xs">
                <span className="text-[11px] font-bold uppercase text-ds-muted tracking-wider">
                  Check-in Logs:
                </span>
                <div className="flex flex-col gap-1">
                  {item.checkIns.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            scan.result === 'allowed' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {scan.result === 'allowed' ? 'check_circle' : 'cancel'}
                        </span>
                        <span className="font-medium text-ds-ink">
                          {scan.zoneName || 'General Checkpoint'}
                        </span>
                        <span className="text-ds-muted">
                          ({scan.result === 'allowed' ? 'Allowed' : scan.reason || 'Denied'})
                        </span>
                      </div>
                      <span className="text-ds-muted font-mono text-[11px]">
                        {formatTime(scan.scannedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
