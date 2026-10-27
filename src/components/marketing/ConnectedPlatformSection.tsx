'use client';

import React from 'react';
import { useInView } from './useScrollReveal';
import { AramLogo } from '@/components/brand/AramLogo';

export function ConnectedPlatformSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="solutions"
      className="py-24 bg-ds-subtle relative overflow-hidden border-b border-ds-line-strong/30 select-none"
    >
      {/* Background ambient lighting */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-ds-accent/25 shadow-xs mb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ds-accent animate-ping" />
            <span className="font-jakarta text-[11px] font-bold text-ds-accent-strong uppercase tracking-wider">
              Integrated Architecture
            </span>
          </div>

          <h2
            className={`font-space text-3xl sm:text-4xl lg:text-[42px] text-ds-ink tracking-tight mb-4 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Everything your event needs.{' '}
            <span className="bg-ds-accent bg-clip-text text-transparent">
              Connected.
            </span>
          </h2>

          <p
            className={`font-jakarta text-[15px] sm:text-[16px] text-ds-body leading-relaxed transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            A cohesive real-time operating mesh that eliminates fragmented point solutions, vendor silos, and manual data synchronization.
          </p>
        </div>

        {/* Ecosystem Constellation Node Composition */}
        <div
          className={`relative bg-white border border-ds-line rounded-3xl p-8 lg:p-14 shadow-sm transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
              <div className="group bg-white border border-ds-line rounded-2xl p-5 hover:border-ds-accent/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent-strong shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[19px]">architecture</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[17px] font-bold text-ds-ink tracking-tight">CREATE</h3>
                    <div className="font-jakarta text-[10px] font-bold text-ds-accent tracking-wider uppercase">
                      Event Architecture &amp; Identity
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[13px] text-ds-body leading-relaxed">
                  Stage plots, spatial seating layouts, dynamic program scheduling, and bespoke brand design frameworks.
                </p>
              </div>

              {/* Node 2: PUBLISH */}
              <div className="group bg-white border border-ds-line rounded-2xl p-5 hover:border-ds-accent/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent-strong shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[19px]">cell_tower</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[17px] font-bold text-ds-ink tracking-tight">PUBLISH</h3>
                    <div className="font-jakarta text-[10px] font-bold text-ds-accent tracking-wider uppercase">
                      Global Distribution &amp; Portals
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[13px] text-ds-body leading-relaxed">
                  High-converting branded attendee portals, speaker microsites, and media press accreditation centers.
                </p>
              </div>

              {/* Node 3: REGISTER */}
              <div className="group bg-white border border-ds-line rounded-2xl p-5 hover:border-ds-accent/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent-strong shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[19px]">badge</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[17px] font-bold text-ds-ink tracking-tight">REGISTER</h3>
                    <div className="font-jakarta text-[10px] font-bold text-ds-accent tracking-wider uppercase">
                      Fluid Frictionless Access
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[13px] text-ds-body leading-relaxed">
                  One-tap cryptographic NFC badges, wallet passes, tiered VIP clearances, and biometric guest entry.
                </p>
              </div>
            </div>

            {/* Central Hub Node: Aram Events Core */}
            <div className="flex flex-col items-center justify-center my-6 md:my-0">
              <div className="relative w-64 h-64 rounded-full flex items-center justify-center p-3 bg-ds-accent-soft shadow-sm">
                {/* Radiant Rings */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-ds-accent/40 animate-spin pointer-events-none"
                  style={{ animationDuration: '28s' }}
                />
                <div className="absolute -inset-4 rounded-full border border-ds-accent/20 pointer-events-none" />
                <div className="absolute -inset-8 rounded-full border border-ds-line-strong/25 hidden md:block pointer-events-none" />

                {/* Center Core */}
                <div className="w-48 h-48 rounded-full bg-ds-ink text-white flex flex-col items-center justify-center p-6 text-center shadow-2xl border border-white/20 animate-float-subtle">
                  <AramLogo size="sm" tone="light" className="mb-1" />
                  <span className="font-jakarta text-[10px] text-[#C4B5FD] uppercase tracking-wider mt-0.5 font-semibold">
                    Core Telemetry
                  </span>
                  <div className="mt-2.5 font-jakarta text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-[#A7F3D0] border border-white/15 backdrop-blur-md flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                    <span>ONLINE // ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Constellation Nodes + Visual Fragment */}
            <div className="flex flex-col gap-6">
              {/* Node 4: OPERATE */}
              <div className="group bg-white border border-ds-line rounded-2xl p-5 hover:border-ds-accent/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent-strong shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[19px]">sensors</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[17px] font-bold text-ds-ink tracking-tight">OPERATE</h3>
                    <div className="font-jakarta text-[10px] font-bold text-ds-accent tracking-wider uppercase">
                      Live Venue Control &amp; Flow
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[13px] text-ds-body leading-relaxed">
                  Backstage intercom cue integration, live security turnstile sync, stage teleprompter sync, and queue dispatch.
                </p>
              </div>

              {/* Node 5: ANALYZE */}
              <div className="group bg-white border border-ds-line rounded-2xl p-5 hover:border-ds-accent/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-ds-accent-soft flex items-center justify-center text-ds-accent-strong shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[19px]">monitoring</span>
                  </div>
                  <div>
                    <h3 className="font-space text-[17px] font-bold text-ds-ink tracking-tight">ANALYZE</h3>
                    <div className="font-jakarta text-[10px] font-bold text-ds-accent tracking-wider uppercase">
                      Post-Event Intelligence
                    </div>
                  </div>
                </div>
                <p className="font-jakarta text-[13px] text-ds-body leading-relaxed">
                  High-fidelity sponsor exposure valuation, session dwell heatmaps, and executive board debrief dossiers.
                </p>
              </div>

              {/* Photographic Fragment of Real Production */}
              <div className="relative rounded-2xl overflow-hidden h-28 border border-ds-line group shadow-sm">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAYh-Rj9Ow__wF46DA66_nLmFZOqLkvau1xmMCCunV_7ZBqzmVz2m8T_VqWza3ib4lShEIgjwS8429m9aIaIZ78u8FsKKEvs1bLDORYY_EU3wDx05PhCjwO6srJElXfQ2o7wVKI6vFuugrumzsTjIN7v9ndFIO9Bx0L8cCnRizrXZThzfAgQilvA8FxHJhLmXEKz3_7eEXN7OZN4SqJoiUM5yx8VMZVjTxsTXYdOKUi4LhQTqUq-btcSA')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ds-ink/95 via-ds-ink/40 to-transparent p-3.5 flex flex-col justify-end">
                  <span className="font-jakarta text-[10px] font-bold text-[#C4B5FD] uppercase tracking-wider">
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
