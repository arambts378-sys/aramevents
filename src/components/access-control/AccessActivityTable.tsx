'use client';

import React, { useState, useMemo } from 'react';

export interface ScanRecord {
  id: string;
  scanned_at: string;
  result: 'allowed' | 'denied' | string;
  reason?: string | null;
  access_zones?: { name?: string } | null;
  registrations?: {
    registration_number?: string;
    event_people?: Array<{
      people?: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        email?: string;
      };
    }>;
  } | null;
}

interface AccessActivityTableProps {
  scans: ScanRecord[];
}

function getAttendeeName(person?: { first_name?: string; last_name?: string; full_name?: string }): string {
  if (!person) return 'Anonymous Participant';
  const combined = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
  return combined || person.full_name || 'Anonymous Participant';
}

function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // Formula injection mitigation (L16): prefix leading =, +, -, @, \t, \r with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function AccessActivityTable({ scans }: AccessActivityTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'allowed' | 'denied'>('all');

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      // Result filter
      if (filterResult !== 'all' && scan.result !== filterResult) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const person = scan.registrations?.event_people?.[0]?.people;
        const personName = getAttendeeName(person).toLowerCase();
        const personEmail = person?.email?.toLowerCase() || '';
        const regNumber = scan.registrations?.registration_number?.toLowerCase() || '';
        const zoneName = scan.access_zones?.name?.toLowerCase() || '';
        const reason = scan.reason?.toLowerCase() || '';

        if (
          !personName.includes(q) &&
          !personEmail.includes(q) &&
          !regNumber.includes(q) &&
          !zoneName.includes(q) &&
          !reason.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [scans, searchQuery, filterResult]);

  // Export CSV Handler with Formula Injection Protection (L16)
  const handleExportCSV = () => {
    if (scans.length === 0) return;

    const headers = ['Time', 'Attendee Name', 'Attendee Email', 'Registration #', 'Zone', 'Result', 'Reason'];
    const rows = filteredScans.map((s) => {
      const time = new Date(s.scanned_at).toLocaleString();
      const person = s.registrations?.event_people?.[0]?.people;
      const name = getAttendeeName(person);
      const email = person?.email || '';
      const regNum = s.registrations?.registration_number || '';
      const zone = s.access_zones?.name || 'Unknown Zone';
      const result = s.result || '';
      const reason = s.reason || '';

      return [time, name, email, regNum, zone, result, reason].map(sanitizeCsvValue);
    });

    const csvContent = [headers.map(sanitizeCsvValue).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `access_activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allowedCount = scans.filter((s) => s.result === 'allowed').length;
  const deniedCount = scans.filter((s) => s.result === 'denied').length;

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted pointer-events-none">
              search
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-3.5 py-2 text-[13px] font-jakarta bg-white border border-ds-line rounded-xl text-ds-ink placeholder-ds-muted/60 focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all"
              placeholder="Search by attendee, zone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-ds-accent-soft rounded-xl border border-ds-line/60">
            <button
              type="button"
              onClick={() => setFilterResult('all')}
              className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all ${
                filterResult === 'all'
                  ? 'bg-white text-ds-ink shadow-xs'
                  : 'text-ds-muted hover:text-ds-ink'
              }`}
            >
              All ({scans.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterResult('allowed')}
              className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                filterResult === 'allowed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-ds-muted hover:text-ds-ink'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Allowed ({allowedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterResult('denied')}
              className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                filterResult === 'denied'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-ds-muted hover:text-ds-ink'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Denied ({deniedCount})
            </button>
          </div>
        </div>

        {/* Export Action */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={scans.length === 0}
            className="px-3.5 py-2 border border-ds-line rounded-xl text-ds-muted hover:text-ds-ink hover:bg-ds-subtle transition-colors font-jakarta text-[12px] font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[17px]">file_download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scans Table / Cards Container */}
      <div className="border border-ds-line rounded-xl overflow-hidden bg-white shadow-xs">
        {filteredScans.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <h4 className="font-space text-[17px] font-bold text-ds-ink">
              {scans.length === 0 ? 'No scan activity yet' : 'No matching activity records'}
            </h4>
            <p className="font-jakarta text-[13px] text-ds-muted mt-1 max-w-md mx-auto">
              {scans.length === 0
                ? 'When volunteers or staff scan attendee QR credentials at checkpoints, live entries will appear here.'
                : 'Try adjusting your search criteria or clearing filter pills.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ds-accent-soft/60 border-b border-ds-line">
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-ds-muted font-bold">
                    TIME
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-ds-muted font-bold">
                    ATTENDEE / CREDENTIAL
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-ds-muted font-bold">
                    ZONE
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-ds-muted font-bold">
                    RESULT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-line/60">
                {filteredScans.map((scan) => {
                  const person = scan.registrations?.event_people?.[0]?.people;
                  const personName = getAttendeeName(person);
                  const regNum = scan.registrations?.registration_number;
                  const zoneName = scan.access_zones?.name || 'Unknown Zone';
                  const scanDate = new Date(scan.scanned_at);
                  const isAllowed = scan.result === 'allowed';

                  return (
                    <tr
                      key={scan.id}
                      className="hover:bg-ds-subtle/30 transition-colors"
                    >
                      {/* Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-[12px] font-semibold text-ds-ink block">
                          {scanDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[11px] text-ds-muted font-jakarta block">
                          {scanDate.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Attendee */}
                      <td className="px-5 py-4">
                        <span className="font-jakarta text-[13px] font-bold text-ds-ink block">
                          {personName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {regNum && (
                            <span className="font-mono text-[11px] text-ds-accent font-semibold">
                              {regNum}
                            </span>
                          )}
                          {person?.email && (
                            <span className="text-[11px] text-ds-muted font-jakarta truncate max-w-[200px]">
                              {person.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ds-accent-soft text-ds-ink font-jakarta text-[12px] font-semibold border border-ds-line">
                          <span className="material-symbols-outlined text-[15px] text-ds-accent">
                            meeting_room
                          </span>
                          <span>{zoneName}</span>
                        </span>
                      </td>

                      {/* Result */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {isAllowed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-mono font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ALLOWED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-mono font-bold border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              DENIED
                            </span>
                          )}
                          {scan.reason && (
                            <span className="text-[11px] text-ds-muted font-jakarta max-w-xs truncate">
                              {scan.reason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
