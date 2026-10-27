'use client';

import React from 'react';
import Link from 'next/link';
import { WorkspacePersonRow } from '@/services/peopleService';

interface PeopleTableProps {
  people: WorkspacePersonRow[];
  onEditPerson: (person: WorkspacePersonRow) => void;
}

function formatDate(isoString: string): string {
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

function getInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function PeopleTable({ people, onEditPerson }: PeopleTableProps) {
  return (
    <div className="w-full">
      {/* ============================================================ */}
      {/* DESKTOP TABLE VIEW (> 768px)                                */}
      {/* ============================================================ */}
      <div className="hidden md:block bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ds-subtle border-b border-ds-line text-[11px] font-bold text-ds-muted uppercase tracking-wider">
                <th scope="col" className="py-3 px-4">Person</th>
                <th scope="col" className="py-3 px-4">Email</th>
                <th scope="col" className="py-3 px-4">Phone</th>
                <th scope="col" className="py-3 px-4 text-center">Events</th>
                <th scope="col" className="py-3 px-4">Registration</th>
                <th scope="col" className="py-3 px-4">Attendance</th>
                <th scope="col" className="py-3 px-4">Last Activity</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-line text-xs font-medium text-ds-ink">
              {people.map((person) => {
                const initials = getInitials(person.fullName);
                return (
                  <tr
                    key={person.id}
                    className="hover:bg-ds-subtle/70 transition-colors group"
                  >
                    {/* 1. Person */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ds-accent/10 text-ds-accent font-bold flex items-center justify-center text-xs shrink-0 border border-ds-accent/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/app/people/${person.id}`}
                            className="font-semibold text-ds-ink hover:text-ds-accent transition-colors truncate block"
                          >
                            {person.fullName}
                          </Link>
                          {(person.job_title || person.organization) && (
                            <span className="text-[11px] text-ds-muted block truncate max-w-[180px]">
                              {[person.job_title, person.organization]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email */}
                    <td className="py-3.5 px-4 text-ds-muted">
                      <span className="truncate block max-w-[200px]" title={person.email}>
                        {person.email}
                      </span>
                    </td>

                    {/* 3. Phone */}
                    <td className="py-3.5 px-4 text-ds-muted">
                      {person.phone ? (
                        <span>{person.phone}</span>
                      ) : (
                        <span className="text-ds-muted">—</span>
                      )}
                    </td>

                    {/* 4. Events Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ds-canvas text-ds-ink border border-ds-line">
                        {person.eventsCount}
                      </span>
                    </td>

                    {/* 5. Registration */}
                    <td className="py-3.5 px-4">
                      {person.registrationStatus ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            person.registrationStatus.toLowerCase() === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : person.registrationStatus.toLowerCase() === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : person.registrationStatus.toLowerCase() === 'active'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {person.registrationStatus}
                        </span>
                      ) : (
                        <span className="text-ds-muted text-[11px]">Unregistered</span>
                      )}
                    </td>

                    {/* 6. Attendance */}
                    <td className="py-3.5 px-4">
                      {person.hasAttended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Attended ({person.attendanceCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-ds-subtle text-ds-muted border border-ds-line">
                          <span className="w-1.5 h-1.5 rounded-full bg-ds-muted"></span>
                          Not Attended
                        </span>
                      )}
                    </td>

                    {/* 7. Last Activity */}
                    <td className="py-3.5 px-4 text-ds-muted whitespace-nowrap">
                      {formatDate(person.lastActivityAt)}
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/people/${person.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-ds-accent hover:text-ds-accent-strong hover:bg-ds-accent/10 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEditPerson(person)}
                          className="px-2 py-1 text-xs font-semibold text-ds-muted hover:text-ds-ink hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Edit Person"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE / TABLET CARDS VIEW (<= 768px)                       */}
      {/* ============================================================ */}
      <div className="md:hidden flex flex-col gap-3">
        {people.map((person) => {
          const initials = getInitials(person.fullName);
          return (
            <div
              key={person.id}
              className="bg-white border border-ds-line rounded-2xl p-4 shadow-xs flex flex-col gap-3"
            >
              {/* Header: Avatar, Name, and View/Edit Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-ds-accent/10 text-ds-accent font-bold flex items-center justify-center text-xs shrink-0 border border-ds-accent/20">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app/people/${person.id}`}
                      className="font-bold text-ds-ink hover:text-ds-accent transition-colors text-sm truncate block"
                    >
                      {person.fullName}
                    </Link>
                    {(person.job_title || person.organization) && (
                      <span className="text-[11px] text-ds-muted truncate block">
                        {[person.job_title, person.organization]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditPerson(person)}
                    className="p-1.5 text-ds-muted hover:text-ds-ink hover:bg-zinc-100 rounded-lg transition-colors"
                    aria-label={`Edit ${person.fullName}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <Link
                    href={`/app/people/${person.id}`}
                    className="px-2.5 py-1 bg-ds-accent/10 hover:bg-ds-accent/20 text-ds-accent font-semibold text-xs rounded-lg transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Contact Information */}
              <div className="flex flex-col gap-1 text-xs text-ds-muted bg-ds-subtle p-2.5 rounded-xl border border-ds-line/60">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-[15px] text-ds-accent shrink-0">
                    mail
                  </span>
                  <span className="truncate">{person.email}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[15px] text-ds-accent shrink-0">
                      call
                    </span>
                    <span>{person.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats & Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-ds-line text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ds-ink bg-ds-canvas px-2 py-0.5 rounded-md border border-ds-line">
                    <span className="material-symbols-outlined text-[14px] text-ds-accent">
                      event
                    </span>
                    {person.eventsCount} {person.eventsCount === 1 ? 'event' : 'events'}
                  </span>

                  {person.hasAttended ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Attended ({person.attendanceCount})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-50 text-ds-muted border border-ds-line">
                      Not Attended
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-ds-muted">
                  Active: {formatDate(person.lastActivityAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
