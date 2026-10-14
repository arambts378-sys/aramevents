'use client';

import React from 'react';

const liveAuditLogs = [
  { name: 'Priya Sharma', company: 'Horizon Labs', tier: 'VIP Pass', tierBg: 'bg-[#7C5CFC]/30 text-[#EDE9FE]', time: '07:42:18', gate: 'Gate 1' },
  { name: 'Alex Johnson', company: 'Nexus Cloud', tier: 'General', tierBg: 'bg-white/20 text-white', time: '07:42:15', gate: 'Gate 3' },
  { name: 'Meena R', company: 'Vector Robotics', tier: 'Speaker', tierBg: 'bg-[#5B3FE8]/40 text-white', time: '07:42:09', gate: 'Gate 1' },
  { name: 'Karthik S', company: 'Quantum Systems', tier: 'General', tierBg: 'bg-white/20 text-white', time: '07:41:58', gate: 'Gate 4' },
];

export function LiveEventSection() {
  return (
    <section className="relative py-24 text-white overflow-hidden bg-[#17152B]" id="operate">
      {/* Live Event Background Image with Dark Gradient Overlay */}
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80"
          alt="Live event venue ingress hall"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#17152B] via-[#17152B]/85 to-[#17152B]/70" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <span className="text-xs font-bold text-[#EDE9FE] uppercase tracking-wider">04 / OPERATE</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            Event Day. Made Simple.
          </h2>
          <p className="text-base text-[#77738A] mt-2 font-normal">
            Run check-in, access control, staff operations, and attendance from one live system. Zero latency turnstile synchronization across 50+ simultaneous gates.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Mobile Scanner Viewfinder HUD (Col 1-5) */}
          <div className="lg:col-span-5 flex justify-center">
            {/* Smartphone Chrome Container */}
            <div className="w-full max-w-sm rounded-[36px] p-3 bg-[#17152B] border-4 border-[#77738A]/40 shadow-2xl relative">
              <div className="w-full bg-[#0d0b1a] rounded-[28px] overflow-hidden p-5 flex flex-col gap-4 text-white relative">
                {/* Phone Status Bar */}
                <div className="flex justify-between items-center text-xs text-[#77738A]">
                  <span>07:42 AM</span>
                  <span className="flex items-center gap-1 font-bold text-[#22C55E]">
                    <span className="material-symbols-outlined text-xs">wifi</span> 100% ONLINE
                  </span>
                  <span className="material-symbols-outlined text-sm">battery_full</span>
                </div>

                {/* Scanner HUD Reticle */}
                <div className="relative h-64 rounded-2xl border-2 border-dashed border-[#22C55E]/80 flex flex-col items-center justify-center p-4 bg-[#22C55E]/5 overflow-hidden">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#22C55E]" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#22C55E]" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#22C55E]" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#22C55E]" />

                  {/* Green Check Validation Icon */}
                  <div className="w-16 h-16 rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-lg mb-2">
                    <span className="material-symbols-outlined text-3xl font-bold">check</span>
                  </div>
                  <span className="text-sm font-bold text-[#22C55E] tracking-wider">CHECK-IN SUCCESSFUL</span>
                  <span className="text-[10px] text-[#EDE9FE] font-mono mt-0.5">LATENCY: 120ms</span>
                </div>

                {/* Validated Attendee Info Card */}
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#77738A]">Participant</span>
                    <span className="text-[11px] font-bold text-[#22C55E]">VIP ACCESS</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-0.5">Sangeetha G</div>
                  <div className="text-xs text-white/70 mt-1 font-normal">Tech Summit 2026 • Conference Hall A</div>
                </div>

                <div className="flex justify-between text-[11px] text-[#77738A] px-1">
                  <span>Gate: North Turnstile 02</span>
                  <span>Operator: Staff #04</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Operations HUD & Streaming Ingress Feed (Col 6-12) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Quick Status Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                <span className="text-xs text-[#77738A] block font-medium">Total Registered</span>
                <span className="text-2xl font-bold text-white mt-1 block font-mono">2,480</span>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                <span className="text-xs text-[#77738A] block font-medium">Checked In</span>
                <span className="text-2xl font-bold text-[#22C55E] mt-1 block font-mono">1,926</span>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                <span className="text-xs text-[#77738A] block font-medium">Active Staff</span>
                <span className="text-2xl font-bold text-white mt-1 block font-mono">14</span>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md">
                <span className="text-xs text-[#77738A] block font-medium">Active Gates</span>
                <span className="text-2xl font-bold text-[#7C5CFC] mt-1 block font-mono">8</span>
              </div>
            </div>

            {/* Streaming Real-Time Ingress Audit Table */}
            <div className="bg-white/10 rounded-2xl border border-white/15 p-5 backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] live-pulse" />
                  <span className="text-sm font-bold text-white">Live Ingress Audit Stream</span>
                </div>
                <span className="text-xs text-[#77738A] font-mono">1.2 scans / sec</span>
              </div>

              <div className="space-y-2.5">
                {liveAuditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0d0b1a]/60 border border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#22C55E] text-base">check_circle</span>
                      <span className="font-bold text-white">{log.name}</span>
                      <span className="text-[#77738A] hidden sm:inline">{log.company}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${log.tierBg}`}>
                        {log.tier}
                      </span>
                      <span className="text-[#77738A] font-mono">{log.time}</span>
                      <span className="text-[#22C55E] font-bold">{log.gate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
