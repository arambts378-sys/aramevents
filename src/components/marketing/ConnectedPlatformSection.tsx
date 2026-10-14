'use client';

import React from 'react';
import { useInView } from './useScrollReveal';

export function ConnectedPlatformSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="solutions"
      className="py-24 bg-[#FCF8FF] relative overflow-hidden border-b border-[#C9C4D8]/30 select-none"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE5FF] border border-[#C9C4D8]/40 mb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="font-jakarta text-[11px] font-semibold text-[#5F3ADD] uppercase tracking-wider">
              Integrated Architecture
            </span>
          </div>

          <h2
            className={`font-space text-3xl sm:text-4xl lg:text-[40px] text-[#1B192F] tracking-tight mb-4 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Everything your event needs. Connected.
          </h2>

          <p
            className={`font-jakarta text-[15px] sm:text-[16px] text-[#484555] leading-relaxed transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            A cohesive real-time operating mesh that eliminates fragmented point solutions, vendor silos, and manual data synchronization.
          </p>
        </div>

        {/* Ecosystem Constellation Node Composition */}
        <div
          className={`relative bg-white border border-[#C9C4D8]/30 rounded-2xl p-8 lg:p-14 shadow-sm transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Background Ambient Radial Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#c9c4d8_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left Constellation Nodes */}
            <div className="flex flex-col gap-6">
              {/* Node 1: CREATE */}
              <div className="group bg-[#FCF8FF] border border-[#C9C4D8]/40 rounded-xl p-5 hover:border-[#5F3ADD] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EAE5FF] flex items-center justify-center text-[#5F3ADD]">
                    <span className="material-symbols-outlined text-[18px]">architecture</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[18px] font-bold text-[#1B192F]">CREATE</h3>
                    <div className="font-jakarta text-[11px] font-semibold text-[#797587] tracking-wider uppercase">
                      Event Architecture &amp; Identity
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[12px] sm:text-[13px] text-[#484555] leading-relaxed">
                  Stage plots, spatial seating layouts, dynamic program scheduling, and bespoke brand design frameworks.
                </p>
              </div>

              {/* Node 2: PUBLISH */}
              <div className="group bg-[#FCF8FF] border border-[#C9C4D8]/40 rounded-xl p-5 hover:border-[#5F3ADD] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EAE5FF] flex items-center justify-center text-[#5F3ADD]">
                    <span className="material-symbols-outlined text-[18px]">cell_tower</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[18px] font-bold text-[#1B192F]">PUBLISH</h3>
                    <div className="font-jakarta text-[11px] font-semibold text-[#797587] tracking-wider uppercase">
                      Global Distribution &amp; Portals
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[12px] sm:text-[13px] text-[#484555] leading-relaxed">
                  High-converting branded attendee portals, speaker microsites, and media press accreditation centers.
                </p>
              </div>

              {/* Node 3: REGISTER */}
              <div className="group bg-[#FCF8FF] border border-[#C9C4D8]/40 rounded-xl p-5 hover:border-[#5F3ADD] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EAE5FF] flex items-center justify-center text-[#5F3ADD]">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[18px] font-bold text-[#1B192F]">REGISTER</h3>
                    <div className="font-jakarta text-[11px] font-semibold text-[#797587] tracking-wider uppercase">
                      Fluid Frictionless Access
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[12px] sm:text-[13px] text-[#484555] leading-relaxed">
                  One-tap cryptographic NFC badges, wallet passes, tiered VIP clearances, and biometric guest entry.
                </p>
              </div>
            </div>

            {/* Central Hub Node: ARAM BTS Core */}
            <div className="flex flex-col items-center justify-center my-6 md:my-0">
              <div className="relative w-56 h-56 rounded-full flex items-center justify-center p-2 bg-gradient-to-b from-[#5F3ADD]/20 via-[#F0EBFF] to-[#FCF8FF]">
                {/* Radiant Rings */}
                <div
                  className="absolute inset-0 rounded-full border border-[#5F3ADD]/30 animate-spin pointer-events-none"
                  style={{ animationDuration: '24s' }}
                />
                <div className="absolute -inset-4 rounded-full border border-[#5F3ADD]/15 pointer-events-none" />
                <div className="absolute -inset-8 rounded-full border border-[#C9C4D8]/20 hidden md:block pointer-events-none" />

                {/* Center Core */}
                <div className="w-44 h-44 rounded-full bg-[#1B192F] text-white flex flex-col items-center justify-center p-6 text-center shadow-xl border border-white/20 animate-float-subtle">
                  <div className="w-8 h-8 rounded-full bg-[#5F3ADD] flex items-center justify-center mb-2 shadow-sm">
                    <span className="material-symbols-outlined text-[18px] text-white">hub</span>
                  </div>
                  <span className="font-space text-[18px] font-bold tracking-tight text-white">
                    ARAM BTS
                  </span>
                  <span className="font-jakarta text-[10px] text-[#E4DFFE] uppercase tracking-wider mt-0.5">
                    Core Telemetry
                  </span>
                  <div className="mt-2 font-jakarta text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5F3ADD]/25 text-[#CABEFF] border border-[#5F3ADD]/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] live-pulse" />
                    <span>ONLINE // ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Constellation Nodes + Visual Fragment */}
            <div className="flex flex-col gap-6">
              {/* Node 4: OPERATE */}
              <div className="group bg-[#FCF8FF] border border-[#C9C4D8]/40 rounded-xl p-5 hover:border-[#5F3ADD] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EAE5FF] flex items-center justify-center text-[#5F3ADD]">
                    <span className="material-symbols-outlined text-[18px]">sensors</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[18px] font-bold text-[#1B192F]">OPERATE</h3>
                    <div className="font-jakarta text-[11px] font-semibold text-[#797587] tracking-wider uppercase">
                      Live Venue Control &amp; Flow
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[12px] sm:text-[13px] text-[#484555] leading-relaxed">
                  Backstage intercom cue integration, live security turnstile sync, stage teleprompter sync, and queue dispatch.
                </p>
              </div>

              {/* Node 5: ANALYZE */}
              <div className="group bg-[#FCF8FF] border border-[#C9C4D8]/40 rounded-xl p-5 hover:border-[#5F3ADD] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EAE5FF] flex items-center justify-center text-[#5F3ADD]">
                    <span className="material-symbols-outlined text-[18px]">monitoring</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[18px] font-bold text-[#1B192F]">ANALYZE</h3>
                    <div className="font-jakarta text-[11px] font-semibold text-[#797587] tracking-wider uppercase">
                      Post-Event Intelligence
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[12px] sm:text-[13px] text-[#484555] leading-relaxed">
                  High-fidelity sponsor exposure valuation, session dwell heatmaps, and executive board debrief dossiers.
                </p>
              </div>

              {/* Photographic Fragment of Real Production */}
              <div className="relative rounded-xl overflow-hidden h-28 border border-[#C9C4D8]/30 group shadow-sm">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAYh-Rj9Ow__wF46DA66_nLmFZOqLkvau1xmMCCunV_7ZBqzmVz2m8T_VqWza3ib4lShEIgjwS8429m9aIaIZ78u8FsKKEvs1bLDORYY_EU3wDx05PhCjwO6srJElXfQ2o7wVKI6vFuugrumzsTjIN7v9ndFIO9Bx0L8cCnRizrXZThzfAgQilvA8FxHJhLmXEKz3_7eEXN7OZN4SqJoiUM5yx8VMZVjTxsTXYdOKUi4LhQTqUq-btcSA')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B192F]/90 via-[#1B192F]/40 to-transparent p-3 flex flex-col justify-end">
                  <span className="font-jakarta text-[10px] font-semibold text-[#E4DFFE] uppercase tracking-wider">
                    Synchronized Hardware Layer
                  </span>
                  <span className="font-space text-[13px] font-bold text-white tracking-tight">
                    DMX512 + Art-Net + Turnstile Handshake
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
