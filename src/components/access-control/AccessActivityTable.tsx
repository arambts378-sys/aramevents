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
        full_name?: string;
        email?: string;
      };
    }>;
  } | null;
}

interface AccessActivityTableProps {
  scans: ScanRecord[];
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
        const personName =
          scan.registrations?.event_people?.[0]?.people?.full_name?.toLowerCase() || '';
        const personEmail =
          scan.registrations?.event_people?.[0]?.people?.email?.toLowerCase() || '';
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

  // Export CSV Handler
  const handleExportCSV = () => {
    if (scans.length === 0) return;

    const headers = ['Time', 'Attendee Name', 'Attendee Email', 'Registration #', 'Zone', 'Result', 'Reason'];
    const rows = filteredScans.map((s) => {
      const time = new Date(s.scanned_at).toLocaleString();
      const name = s.registrations?.event_people?.[0]?.people?.full_name || 'Unknown';
      const email = s.registrations?.event_people?.[0]?.people?.email || '';
      const regNum = s.registrations?.registration_number || '';
      const zone = s.access_zones?.name || 'Unknown Zone';
      const result = s.result || '';
      const reason = s.reason || '';

      return [time, name, email, regNum, zone, result, reason].map((val) =>
        `"${String(val).replace(/"/g, '""')}"`
      );
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#77738A] pointer-events-none">
              search
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-3.5 py-2 text-[13px] font-jakarta bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
              placeholder="Search by attendee, zone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-[#F6F1FF] rounded-xl border border-[#E6E2F0]/60">
            <button
              type="button"
              onClick={() => setFilterResult('all')}
              className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all ${
                filterResult === 'all'
                  ? 'bg-white text-[#17152B] shadow-xs'
                  : 'text-[#77738A] hover:text-[#17152B]'
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
                  : 'text-[#77738A] hover:text-[#17152B]'
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
                  : 'text-[#77738A] hover:text-[#17152B]'
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
            className="px-3.5 py-2 border border-[#E6E2F0] rounded-xl text-[#77738A] hover:text-[#17152B] hover:bg-[#F6F1FF] transition-colors font-jakarta text-[12px] font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[17px]">file_download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scans Table / Cards Container */}
      <div className="border border-[#E6E2F0] rounded-xl overflow-hidden bg-white shadow-xs">
        {filteredScans.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <h4 className="font-space text-[17px] font-bold text-[#17152B]">
              {scans.length === 0 ? 'No scan activity yet' : 'No matching activity records'}
            </h4>
            <p className="font-jakarta text-[13px] text-[#77738A] mt-1 max-w-md mx-auto">
              {scans.length === 0
                ? 'When volunteers or staff scan attendee QR credentials at checkpoints, live entries will appear here.'
                : 'Try adjusting your search criteria or clearing filter pills.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F1FF]/60 border-b border-[#E6E2F0]">
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-[#77738A] font-bold">
                    TIME
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-[#77738A] font-bold">
                    ATTENDEE / CREDENTIAL
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-[#77738A] font-bold">
                    ZONE
                  </th>
                  <th className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-[#77738A] font-bold">
                    RESULT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2F0]/60">
                {filteredScans.map((scan) => {
                  const person = scan.registrations?.event_people?.[0]?.people;
                  const personName = person?.full_name || 'Anonymous Participant';
                  const regNum = scan.registrations?.registration_number;
                  const zoneName = scan.access_zones?.name || 'Unknown Zone';
                  const scanDate = new Date(scan.scanned_at);
                  const isAllowed = scan.result === 'allowed';

                  return (
                    <tr
                      key={scan.id}
                      className="hover:bg-[#F6F1FF]/30 transition-colors"
                    >
                      {/* Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-[12px] font-semibold text-[#17152B] block">
                          {scanDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[11px] text-[#77738A] font-jakarta block">
                          {scanDate.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Attendee */}
                      <td className="px-5 py-4">
                        <span className="font-jakarta text-[13px] font-bold text-[#17152B] block">
                          {personName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {regNum && (
                            <span className="font-mono text-[11px] text-[#7C5CFC] font-semibold">
                              {regNum}
                            </span>
                          )}
                          {person?.email && (
                            <span className="text-[11px] text-[#77738A] font-jakarta truncate max-w-[200px]">
                              {person.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F6F1FF] text-[#17152B] font-jakarta text-[12px] font-semibold border border-[#E6E2F0]">
                          <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">
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
                            <span className="text-[11px] text-[#77738A] font-jakarta max-w-xs truncate">
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
