'use client';

import React from 'react';
import { useInView, AnimatedCounter } from './useScrollReveal';

export function EventOperationsSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="operations"
      className="relative overflow-hidden bg-[#11101A] py-12 text-white select-none sm:py-16 lg:py-24"
    >
      {/* Ambient Stage Glow Elements */}
      <div className="absolute -top-40 right-1/4 w-96 h-96 bg-[#5F3ADD]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-96 h-96 bg-[#573AE4]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-10 flex flex-col justify-between gap-5 md:mb-16 md:flex-row md:items-end md:gap-6">
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
            className={`flex flex-wrap items-center gap-2 font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 ${
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
          className={`relative overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-md transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-2xl ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Background Atmospheric Photography */}
          <div className="relative w-full md:min-h-[520px]">
            <div
              className="pointer-events-none absolute inset-0 transform animate-cinematic-zoom bg-cover bg-center opacity-10 md:opacity-20"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDEr9ruX6EZtJ_fWX4MrTnr09fQox8ii_d2xiQOnAYFoe017D4Q55KHOtMeKPd1jMyYAkpCjw5xcEqfZhqpULJlNhUGUkVhkwqQpXUvJDrdzZnAiLc-F8LDgqQtr-Mk1u00NhHRvH5oCC0xF5bK_suNbpLteQsL8Q88Oxh4HCXqLtpQz1CfhrcFNW7naIlZNKVU-nIkFDtEMlSCQObb1i_pIrQM0iDXBz3RklaHp7d1E7x4jXCfG1v5Hg')`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11101A] via-[#11101A]/85 to-[#11101A]/70" />

            {/* Live HUD Telemetry Overlay */}
            <div className="relative z-10 flex flex-col justify-between p-4 sm:p-6 md:min-h-[520px] md:p-10">
              {/* Top HUD Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 font-jakarta sm:pb-6">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse" />
                    <span className="text-[13px] font-semibold tracking-wide text-white">
                      METROPOLITAN ARENA A
                    </span>
                  </div>
                  <span className="hidden text-[12px] text-white/30 sm:inline">|</span>
                  <span className="text-[11px] text-[#C9C4D8] font-mono sm:text-[12px]">
                    GATE ARRAY: ALPHA 01-08
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-[11px] font-mono text-[#CABEFF] sm:text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>SYNCED: 100.0% OFFLINE-FALLBACK READY</span>
                </div>
              </div>

              {/* Main HUD Telemetry Readout Grid */}
              <div className="my-6 grid min-w-0 grid-cols-1 gap-3 font-jakarta sm:grid-cols-2 sm:gap-4 sm:my-8 xl:my-10 xl:grid-cols-4 xl:gap-6">
                {/* Metric 1 */}
                <div className="flex min-w-0 flex-col justify-between rounded-xl border border-white/15 bg-[#11101A]/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 xl:bg-white/5 xl:p-6">
                  <div className="mb-2 text-[11px] font-semibold leading-snug tracking-wide text-[#E2DEED] sm:tracking-wider">
                    Attendees Present
                  </div>
                  <div>
                    <div className="font-space text-3xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-4xl">
                      <AnimatedCounter end={2480} />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      <span>Live in Arena</span>
                    </div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="flex min-w-0 flex-col justify-between rounded-xl border border-white/15 bg-[#11101A]/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 xl:bg-white/5 xl:p-6">
                  <div className="mb-2 text-[11px] font-semibold leading-snug tracking-wide text-[#E2DEED] sm:tracking-wider">
                    Checked In Flow
                  </div>
                  <div>
                    <div className="font-space text-3xl font-bold leading-none tracking-tight text-[#CABEFF] tabular-nums sm:text-4xl">
                      <AnimatedCounter end={1926} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[12px] text-white/80">
                      <span className="font-semibold text-white">77.6%</span>
                      <span>of ticketed roster</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="flex min-w-0 flex-col justify-between rounded-xl border border-white/15 bg-[#11101A]/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 xl:bg-white/5 xl:p-6">
                  <div className="mb-2 text-[11px] font-semibold leading-snug tracking-wide text-[#E2DEED] sm:tracking-wider">
                    Active Venue Zones
                  </div>
                  <div>
                    <div className="font-space text-3xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-4xl">
                      <AnimatedCounter end={14} />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>All Green Status</span>
                    </div>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="flex min-w-0 flex-col justify-between rounded-xl border border-white/15 bg-[#11101A]/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 xl:bg-white/5 xl:p-6">
                  <div className="mb-2 text-[11px] font-semibold leading-snug tracking-wide text-[#E2DEED] sm:tracking-wider">
                    Current Arrival Rate
                  </div>
                  <div>
                    <div className="whitespace-nowrap font-space text-3xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-4xl">
                      <AnimatedCounter end={412} suffix="/hr" />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white/80">
                      <span>Average wait: 8.2s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Cue Strip Row */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/15 bg-black/50 p-3 font-jakarta sm:gap-4 sm:p-4 md:flex-row md:items-center">
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-4 md:w-auto">
                  <span className="shrink-0 rounded bg-[#5F3ADD] px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                    RUN-OF-SHOW
                  </span>
                  <span className="min-w-0 text-[12px] font-medium leading-relaxed text-white">
                    CUE 42 // KEYNOTE OPENING REEL &amp; INTRO LIGHTS
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] font-mono text-[#D8D3E3] sm:text-[12px] md:justify-start">
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
