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
    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5 hover:border-[#6366F1]/30 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E6E2F0] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
            <span className="material-symbols-outlined text-[19px]">sensors</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#17152B] tracking-tight">
              Operational & Checkpoint Insights
            </h2>
            <p className="text-xs text-[#77738A] mt-0.5 font-normal">
              Live scanner outcomes, gate throughput, and access validation metrics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#6366F1] bg-[#6366F1]/10 py-1.5 px-3 rounded-xl border border-[#6366F1]/20 self-start sm:self-auto">
          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
          <span>{totalScans.toLocaleString()} Total Scans</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Validation Outcomes */}
        <div className="flex flex-col justify-between p-4 bg-gradient-to-br from-[#FAFAFD] to-[#F7F5FF] border border-[#E6E2F0] rounded-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                Validation Outcomes
              </span>
              <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                {allowedRate !== null ? `${allowedRate}% Success` : '0%'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-2xl font-extrabold text-[#10B981] tabular-nums">
                  {allowedScans.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#77738A] block font-medium">
                  Verified Passes
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#F43F5E] tabular-nums">
                  {deniedScans.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#77738A] block font-medium">
                  Rejected ({deniedRate !== null ? `${deniedRate}%` : '0%'})
                </span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-2.5 bg-[#F43F5E] rounded-full overflow-hidden flex mt-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#10B981] to-[#34D399] h-full transition-all duration-500"
                style={{ width: `${allowedRate || 0}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-3 leading-relaxed">
            Includes duplicate entry alerts, invalid badge passes, and checkpoint restrictions.
          </p>
        </div>

        {/* 2. Checkpoint Zone Activity */}
        <div className="flex flex-col justify-between p-4 bg-gradient-to-br from-[#FAFAFD] to-[#F7F5FF] border border-[#E6E2F0] rounded-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                Checkpoint Activity
              </span>
              <span className="text-[10px] font-semibold text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full">
                Active Gates
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
              {zoneActivities.length === 0 ? (
                <p className="text-xs text-[#77738A] italic py-2">No checkpoint logs recorded</p>
              ) : (
                zoneActivities.map((zone) => (
                  <div
                    key={zone.zoneId}
                    className="flex items-center justify-between text-xs font-medium bg-white/80 p-2 rounded-lg border border-[#E6E2F0]/80"
                  >
                    <span className="text-[#17152B] font-semibold truncate max-w-[140px]">
                      {zone.zoneName}
                    </span>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <span className="text-[#10B981] font-bold bg-[#10B981]/10 px-1.5 py-0.5 rounded text-[11px]">
                        {zone.allowedScans} ok
                      </span>
                      {zone.deniedScans > 0 && (
                        <span className="text-[#F43F5E] font-bold bg-[#F43F5E]/10 px-1.5 py-0.5 rounded text-[10px]">
                          {zone.deniedScans} rej
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-2">
            Designated access points and turnstiles actively scanning attendee passes.
          </p>
        </div>

        {/* 3. Peak Scan Window */}
        <div className="flex flex-col justify-between p-4 bg-gradient-to-br from-[#FAFAFD] to-[#F7F5FF] border border-[#E6E2F0] rounded-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                Peak Ingress Windows
              </span>
              <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                Traffic Spike
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {peakHours.length === 0 ? (
                <p className="text-xs text-[#77738A] italic py-2">No scan timestamps recorded</p>
              ) : (
                peakHours.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs font-medium bg-white p-2 rounded-lg border border-[#E6E2F0] hover:border-[#6366F1]/30 transition-colors"
                  >
                    <span className="text-[#17152B] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#6366F1]">
                        schedule
                      </span>
                      {item.label}
                    </span>
                    <span className="text-[#6366F1] font-extrabold tabular-nums bg-[#6366F1]/10 px-2 py-0.5 rounded">
                      {item.count} scan{item.count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#77738A] mt-2">
            Highest throughput intervals during check-in windows.
          </p>
        </div>
      </div>
    </div>
  );
}
