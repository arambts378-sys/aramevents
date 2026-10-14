'use client';

import React from 'react';
import { useInView, AnimatedCounter } from './useScrollReveal';

export function EventOperationsSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="operations"
      className="py-24 bg-[#11101A] text-white relative overflow-hidden select-none"
    >
      {/* Ambient Stage Glow Elements */}
      <div className="absolute -top-40 right-1/4 w-96 h-96 bg-[#5F3ADD]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-96 h-96 bg-[#573AE4]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm mb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
              <span className="font-jakarta text-[11px] text-white tracking-widest uppercase font-semibold">
                LIVE VENUE FEED // SYNCHRONIZED
              </span>
            </div>

            <h2
              className={`font-space text-3xl sm:text-4xl lg:text-[40px] text-white tracking-tight mb-3 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              When the event starts, everything should work.
            </h2>

            <p
              className={`font-jakarta text-[15px] sm:text-[16px] text-[#C9C4D8] leading-relaxed transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Synchronized venue access, crowd flow, and real-time operations across every zone.
            </p>
          </div>

          <div
            className={`flex items-center gap-3 font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="text-[11px] text-[#C9C4D8] uppercase tracking-wider font-semibold">
              NETWORK PROTOCOL
            </span>
            <span className="px-3 py-1 rounded-md bg-white/5 border border-white/15 text-[#CABEFF] text-[11px] font-mono">
              ARAM-MESH // 5.2GHZ ACTIVE
            </span>
          </div>
        </div>

        {/* Operational Backdrop with Live HUD Overlay */}
        <div
          className={`relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Background Atmospheric Photography */}
          <div className="relative min-h-[520px] w-full">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transform animate-cinematic-zoom pointer-events-none"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDEr9ruX6EZtJ_fWX4MrTnr09fQox8ii_d2xiQOnAYFoe017D4Q55KHOtMeKPd1jMyYAkpCjw5xcEqfZhqpULJlNhUGUkVhkwqQpXUvJDrdzZnAiLc-F8LDgqQtr-Mk1u00NhHRvH5oCC0xF5bK_suNbpLteQsL8Q88Oxh4HCXqLtpQz1CfhrcFNW7naIlZNKVU-nIkFDtEMlSCQObb1i_pIrQM0iDXBz3RklaHp7d1E7x4jXCfG1v5Hg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#11101A] via-[#11101A]/60 to-transparent pointer-events-none" />

            {/* Live HUD Telemetry Overlay */}
            <div className="relative z-10 p-6 md:p-10 flex flex-col justify-between min-h-[520px]">
              {/* Top HUD Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 font-jakarta">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse" />
                    <span className="text-[13px] font-semibold tracking-wide text-white">
                      METROPOLITAN ARENA A
                    </span>
                  </div>
                  <span className="text-white/30 text-[12px]">|</span>
                  <span className="text-[12px] text-[#C9C4D8] font-mono">
                    GATE ARRAY: ALPHA 01-08
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-mono text-[#CABEFF]">
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>SYNCED: 100.0% OFFLINE-FALLBACK READY</span>
                </div>
              </div>

              {/* Main HUD Telemetry Readout Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 my-10 font-jakarta">
                {/* Metric 1 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-sm">
                  <div className="text-[11px] text-[#C9C4D8] uppercase tracking-wider mb-2 font-semibold">
                    Attendees Present
                  </div>
                  <div className="font-space text-3xl sm:text-4xl text-white font-bold tracking-tight">
                    <AnimatedCounter end={2480} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-[12px] font-medium">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    <span>Live in Arena</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-sm">
                  <div className="text-[11px] text-[#C9C4D8] uppercase tracking-wider mb-2 font-semibold">
                    Checked In Flow
                  </div>
                  <div className="font-space text-3xl sm:text-4xl text-[#CABEFF] font-bold tracking-tight">
                    <AnimatedCounter end={1926} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-white/70 text-[12px]">
                    <span className="text-white font-semibold">77.6%</span>
                    <span>of ticketed roster</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-sm">
                  <div className="text-[11px] text-[#C9C4D8] uppercase tracking-wider mb-2 font-semibold">
                    Active Venue Zones
                  </div>
                  <div className="font-space text-3xl sm:text-4xl text-white font-bold tracking-tight">
                    <AnimatedCounter end={14} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-[12px] font-medium">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>All Green Status</span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-sm">
                  <div className="text-[11px] text-[#C9C4D8] uppercase tracking-wider mb-2 font-semibold">
                    Current Arrival Rate
                  </div>
                  <div className="font-space text-3xl sm:text-4xl text-white font-bold tracking-tight">
                    <AnimatedCounter end={412} suffix="/hr" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-white/70 text-[12px]">
                    <span>Average wait: 8.2s</span>
                  </div>
                </div>
              </div>

              {/* Bottom Cue Strip Row */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-jakarta">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <span className="px-2.5 py-1 rounded bg-[#5F3ADD] text-white text-[11px] font-bold font-mono">
                    RUN-OF-SHOW
                  </span>
                  <span className="text-[12px] text-white font-medium">
                    CUE 42 // KEYNOTE OPENING REEL &amp; INTRO LIGHTS
                  </span>
                </div>
                <div className="flex items-center gap-6 text-[12px] font-mono text-[#C9C4D8]">
                  <span>TIMECODE: 09:59:45.12</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
                    <span>STANDBY CALL GO</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
