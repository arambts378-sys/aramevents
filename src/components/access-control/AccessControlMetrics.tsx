'use client';

import React from 'react';

interface AccessControlMetricsProps {
  activeZones: number;
  totalZones: number;
  todayScans: number;
  activeVolunteers: number;
}

export function AccessControlMetrics({
  activeZones,
  totalZones,
  todayScans,
  activeVolunteers,
}: AccessControlMetricsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: ACTIVE ZONES */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E2F0] shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between text-[#77738A]">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
            ACTIVE ZONES
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-space text-[32px] md:text-[36px] font-bold text-[#17152B] tracking-tight leading-none">
            {activeZones}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {activeZones > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            )}
            <p className="font-jakarta text-[12px] text-[#77738A]">
              Currently scanning &amp; active
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: TOTAL ZONES */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E2F0] shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between text-[#77738A]">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
            TOTAL ZONES
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[20px]">layers</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-space text-[32px] md:text-[36px] font-bold text-[#17152B] tracking-tight leading-none">
            {totalZones}
          </div>
          <p className="font-jakarta text-[12px] text-[#77738A] mt-2">
            Configured checkpoints
          </p>
        </div>
      </div>

      {/* Card 3: TODAY'S SCANS */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E2F0] shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between text-[#77738A]">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
            TODAY&apos;S SCANS
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-space text-[32px] md:text-[36px] font-bold text-[#17152B] tracking-tight leading-none">
            {todayScans.toLocaleString()}
          </div>
          <p className="font-jakarta text-[12px] text-[#77738A] mt-2">
            Today&apos;s access attempts
          </p>
        </div>
      </div>

      {/* Card 4: ACTIVE VOLUNTEERS */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6E2F0] shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between text-[#77738A]">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
            ACTIVE VOLUNTEERS
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-space text-[32px] md:text-[36px] font-bold text-[#17152B] tracking-tight leading-none">
            {activeVolunteers}
          </div>
          <p className="font-jakarta text-[12px] text-[#77738A] mt-2">
            Assigned scanner devices
          </p>
        </div>
      </div>
    </section>
  );
}
