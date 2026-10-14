'use client';

import React from 'react';

export function LiveControlDashboard() {
  return (
    <section className="py-24 bg-[#0d0b1a] text-white border-t border-white/10" id="solutions">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-bold text-[#EDE9FE] uppercase tracking-wider">ENTERPRISE COMMAND CENTER</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
              See Your Event. Live.
            </h2>
            <p className="text-base text-[#77738A] mt-2 max-w-xl font-normal">
              Real-time ingress curves, gate-by-gate velocity, and instant incident telemetry aggregated across every sensor node.
            </p>
          </div>

          {/* Master Switch & Sync Beacon */}
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-max">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#22C55E]/20 text-[#22C55E] font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] live-pulse" />
              ALL 8 GATES OPERATIONAL
            </div>
            <span className="text-xs text-[#77738A] pr-2 font-mono">Sync: 0.1s</span>
          </div>
        </div>

        {/* Command Center Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Widget 1: Ingress Velocity Curve (Col 1-7) */}
          <div className="lg:col-span-7 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-white">Attendee Ingress Velocity</h4>
                <span className="text-xs text-[#77738A]">Scans aggregated by 15-minute intervals</span>
              </div>
              <span className="text-xs text-[#22C55E] bg-[#22C55E]/15 px-2.5 py-1 rounded-md font-bold">
                Peak: 340 scans/min
              </span>
            </div>

            {/* Curve Simulation via SVG */}
            <div className="h-64 w-full relative flex items-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 200">
                {/* Grid Lines */}
                <line opacity="0.15" stroke="#77738A" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="500" y1="40" y2="40" />
                <line opacity="0.15" stroke="#77738A" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="500" y1="90" y2="90" />
                <line opacity="0.15" stroke="#77738A" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="500" y1="140" y2="140" />

                {/* Gradient Area */}
                <defs>
                  <linearGradient id="ingressGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M0,190 Q60,180 120,130 T240,60 T360,30 T440,90 T500,140 L500,200 L0,200 Z"
                  fill="url(#ingressGradient)"
                />

                {/* Smooth Polyline */}
                <path
                  d="M0,190 Q60,180 120,130 T240,60 T360,30 T440,90 T500,140"
                  fill="none"
                  stroke="#7C5CFC"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />

                {/* Real-Time Head Point Beacon */}
                <circle cx="360" cy="30" r="5" fill="#22C55E" stroke="#0d0b1a" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex justify-between items-center text-xs text-[#77738A] pt-4 border-t border-white/10 mt-2 font-mono">
              <span>06:30 AM</span>
              <span>07:00 AM</span>
              <span className="text-[#22C55E] font-bold">07:30 AM (Doors)</span>
              <span>08:00 AM</span>
              <span>08:30 AM</span>
              <span>09:00 AM</span>
            </div>
          </div>

          {/* Widget 2: Real-time Gate & Zone Capacity Bars (Col 8-12) */}
          <div className="lg:col-span-5 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">Zone Capacities</h4>
                  <span className="text-xs text-[#77738A]">Real-time occupancy limits</span>
                </div>
                <span className="material-symbols-outlined text-[#77738A]">pie_chart</span>
              </div>

              <div className="space-y-4">
                {/* Zone 1 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">Main Auditorium (Hall A)</span>
                    <span className="text-[#22C55E] font-mono font-bold">92% (1,380 / 1,500)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>

                {/* Zone 2 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">Tech Expo & Demo Floor</span>
                    <span className="text-white/80 font-mono font-bold">64% (640 / 1,000)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#5B3FE8] rounded-full" style={{ width: '64%' }} />
                  </div>
                </div>

                {/* Zone 3 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">VIP Founders Lounge</span>
                    <span className="text-[#22C55E] font-mono font-bold">48% (120 / 250)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#22C55E] rounded-full" style={{ width: '48%' }} />
                  </div>
                </div>

                {/* Zone 4 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">Workshop Lab 01</span>
                    <span className="text-[#22C55E] font-mono font-bold">96% (48 / 50)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#22C55E] text-sm">shield</span>
                <span className="text-xs text-[#22C55E] font-bold">Emergency Exits Clear</span>
              </div>
              <span className="text-xs text-[#77738A] font-mono">Sensors: 100% Ok</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
