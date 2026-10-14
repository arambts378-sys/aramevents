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
      <div className="hidden md:block bg-white border border-[#E6E2F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF9FF] border-b border-[#E6E2F0] text-[11px] font-bold text-[#77738A] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#E6E2F0] text-xs font-medium text-[#17152B]">
              {people.map((person) => {
                const initials = getInitials(person.fullName);
                return (
                  <tr
                    key={person.id}
                    className="hover:bg-[#FAF9FF]/70 transition-colors group"
                  >
                    {/* 1. Person */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7C5CFC]/10 text-[#7C5CFC] font-bold flex items-center justify-center text-xs shrink-0 border border-[#7C5CFC]/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/app/people/${person.id}`}
                            className="font-semibold text-[#17152B] hover:text-[#7C5CFC] transition-colors truncate block"
                          >
                            {person.fullName}
                          </Link>
                          {(person.job_title || person.organization) && (
                            <span className="text-[11px] text-[#77738A] block truncate max-w-[180px]">
                              {[person.job_title, person.organization]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email */}
                    <td className="py-3.5 px-4 text-[#77738A]">
                      <span className="truncate block max-w-[200px]" title={person.email}>
                        {person.email}
                      </span>
                    </td>

                    {/* 3. Phone */}
                    <td className="py-3.5 px-4 text-[#77738A]">
                      {person.phone ? (
                        <span>{person.phone}</span>
                      ) : (
                        <span className="text-[#A19DAE]">—</span>
                      )}
                    </td>

                    {/* 4. Events Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F5FF] text-[#17152B] border border-[#E6E2F0]">
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
                        <span className="text-[#A19DAE] text-[11px]">Unregistered</span>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF9FF] text-[#77738A] border border-[#E6E2F0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A19DAE]"></span>
                          Not Attended
                        </span>
                      )}
                    </td>

                    {/* 7. Last Activity */}
                    <td className="py-3.5 px-4 text-[#77738A] whitespace-nowrap">
                      {formatDate(person.lastActivityAt)}
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/people/${person.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-[#7C5CFC] hover:text-[#5B3FE8] hover:bg-[#7C5CFC]/10 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEditPerson(person)}
                          className="px-2 py-1 text-xs font-semibold text-[#77738A] hover:text-[#17152B] hover:bg-zinc-100 rounded-lg transition-colors"
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
              className="bg-white border border-[#E6E2F0] rounded-2xl p-4 shadow-xs flex flex-col gap-3"
            >
              {/* Header: Avatar, Name, and View/Edit Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#7C5CFC]/10 text-[#7C5CFC] font-bold flex items-center justify-center text-xs shrink-0 border border-[#7C5CFC]/20">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app/people/${person.id}`}
                      className="font-bold text-[#17152B] hover:text-[#7C5CFC] transition-colors text-sm truncate block"
                    >
                      {person.fullName}
                    </Link>
                    {(person.job_title || person.organization) && (
                      <span className="text-[11px] text-[#77738A] truncate block">
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
                    className="p-1.5 text-[#77738A] hover:text-[#17152B] hover:bg-zinc-100 rounded-lg transition-colors"
                    aria-label={`Edit ${person.fullName}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <Link
                    href={`/app/people/${person.id}`}
                    className="px-2.5 py-1 bg-[#7C5CFC]/10 hover:bg-[#7C5CFC]/20 text-[#7C5CFC] font-semibold text-xs rounded-lg transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Contact Information */}
              <div className="flex flex-col gap-1 text-xs text-[#77738A] bg-[#FAF9FF] p-2.5 rounded-xl border border-[#E6E2F0]/60">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-[15px] text-[#7C5CFC] shrink-0">
                    mail
                  </span>
                  <span className="truncate">{person.email}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[15px] text-[#7C5CFC] shrink-0">
                      call
                    </span>
                    <span>{person.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats & Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E6E2F0] text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#17152B] bg-[#F7F5FF] px-2 py-0.5 rounded-md border border-[#E6E2F0]">
                    <span className="material-symbols-outlined text-[14px] text-[#7C5CFC]">
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-50 text-[#77738A] border border-[#E6E2F0]">
                      Not Attended
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-[#77738A]">
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
