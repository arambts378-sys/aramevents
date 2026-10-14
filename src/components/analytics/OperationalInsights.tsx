'use client';

import React from 'react';
import { OperationalData } from '@/services/analyticsService';

interface OperationalInsightsProps {
  operational: OperationalData;
}

export function OperationalInsights({ operational }: OperationalInsightsProps) {
  const { totalScans, allowedScans, deniedScans, allowedRate, deniedRate, zoneActivities, peakHours } =
    operational;

  if (totalScans === 0) {
    return null; // Omit operational card if no scanner activity exists in the filter scope
  }

  return (
    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E6E2F0] gap-2">
        <div>
          <h2 className="text-base font-bold text-[#17152B] tracking-tight">
            Operational & Scanner Insights
          </h2>
          <p className="text-xs text-[#77738A] mt-0.5 font-normal">
            Real-time validation outcomes, access checkpoint traffic, and operational throughput.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7C5CFC] bg-[#7C5CFC]/10 py-1 px-3 rounded-lg self-start sm:self-auto">
          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
          <span>{totalScans} Total Scans</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Validation Outcomes */}
        <div className="flex flex-col justify-between p-4 bg-[#FAFAFD] border border-[#E6E2F0] rounded-xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
              Scanner Validation Outcomes
            </span>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-2xl font-extrabold text-[#22C55E] tabular-nums">
                  {allowedScans}
                </span>
                <span className="text-[11px] text-[#77738A] block">
                  Allowed ({allowedRate !== null ? `${allowedRate}%` : '0%'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#DC2626] tabular-nums">
                  {deniedScans}
                </span>
                <span className="text-[11px] text-[#77738A] block">
                  Denied ({deniedRate !== null ? `${deniedRate}%` : '0%'})
                </span>
              </div>
            </div>

            {/* Split bar */}
            <div className="w-full h-2.5 bg-[#DC2626] rounded-full overflow-hidden flex mt-3">
              <div
                className="bg-[#22C55E] h-full transition-all"
                style={{ width: `${allowedRate || 0}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-3">
            Denied scans include duplicate entries, invalid badges, or checkpoints outside access windows.
          </p>
        </div>

        {/* 2. Checkpoint Zone Activity */}
        <div className="flex flex-col justify-between p-4 bg-[#FAFAFD] border border-[#E6E2F0] rounded-xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
              Checkpoint Zone Activity
            </span>
            <div className="mt-3 flex flex-col gap-2.5 max-h-[140px] overflow-y-auto pr-1">
              {zoneActivities.length === 0 ? (
                <p className="text-xs text-[#77738A] italic">No zone checkpoints logged</p>
              ) : (
                zoneActivities.map((zone) => (
                  <div
                    key={zone.zoneId}
                    className="flex items-center justify-between text-xs font-medium border-b border-[#E6E2F0]/60 pb-1.5 last:border-0"
                  >
                    <span className="text-[#17152B] font-semibold truncate max-w-[140px]">
                      {zone.zoneName}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-[#22C55E] font-bold">{zone.allowedScans} ok</span>
                      {zone.deniedScans > 0 && (
                        <span className="text-[#DC2626] text-[10px]">
                          ({zone.deniedScans} rej)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-2">
            Configured access checkpoints receiving attendee scans.
          </p>
        </div>

        {/* 3. Peak Scan Window */}
        <div className="flex flex-col justify-between p-4 bg-[#FAFAFD] border border-[#E6E2F0] rounded-xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
              Peak Check-in Windows
            </span>
            <div className="mt-3 flex flex-col gap-2">
              {peakHours.length === 0 ? (
                <p className="text-xs text-[#77738A] italic">No scan timestamps recorded</p>
              ) : (
                peakHours.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs font-medium bg-white p-2 rounded-lg border border-[#E6E2F0]"
                  >
                    <span className="text-[#17152B] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#7C5CFC]">
                        schedule
                      </span>
                      {item.label}
                    </span>
                    <span className="text-[#7C5CFC] font-extrabold tabular-nums">
                      {item.count} scan{item.count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-2">
            Busiest hours based on validated access requests.
          </p>
        </div>
      </div>
    </div>
  );
}
