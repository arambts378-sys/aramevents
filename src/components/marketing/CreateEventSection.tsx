'use client';

import React from 'react';
import { useInView } from './useScrollReveal';

export function CreateEventSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      className="py-24 bg-ds-accent-soft border-b border-ds-line-strong/30 select-none"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-ds-line-strong/40 mb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="font-jakarta text-[11px] font-semibold text-ds-accent uppercase tracking-wider">
              Streamlined Genesis
            </span>
          </div>

          <h2
            className={`font-space text-3xl sm:text-4xl lg:text-[40px] text-ds-ink tracking-tight mb-4 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Create your event easily.
          </h2>

          <p
            className={`font-jakarta text-[15px] sm:text-[16px] text-ds-body leading-relaxed transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            From the first idea to a live event, bring everything together without unnecessary complexity.
          </p>
        </div>

        {/* Visual Progression Pipeline (PLAN -> BUILD -> PUBLISH) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 font-jakarta">
          {/* 01 PLAN */}
          <div
            className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 flex items-start gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center font-bold font-space text-[20px] shrink-0">
              01
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ds-muted uppercase tracking-wider mb-1">
                STAGE ONE
              </div>
              <h3 className="font-space text-[18px] text-ds-ink mb-1.5 font-bold">
                PLAN
              </h3>
              <p className="text-[12px] sm:text-[13px] text-ds-body leading-relaxed">
                Configure scale parameters, spatial requirements, multi-track rundowns, and VIP tier logic in minutes.
              </p>
            </div>
          </div>

          {/* 02 BUILD */}
          <div
            className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 flex items-start gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '250ms' }}
          >
            <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center font-bold font-space text-[20px] shrink-0">
              02
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ds-muted uppercase tracking-wider mb-1">
                STAGE TWO
              </div>
              <h3 className="font-space text-[18px] text-ds-ink mb-1.5 font-bold">
                BUILD
              </h3>
              <p className="text-[12px] sm:text-[13px] text-ds-body leading-relaxed">
                Synthesize ticketing tiers, pass styles, interactive agenda modules, and speaker bio collaterals effortlessly.
              </p>
            </div>
          </div>

          {/* 03 PUBLISH */}
          <div
            className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 flex items-start gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '350ms' }}
          >
            <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center font-bold font-space text-[20px] shrink-0">
              03
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ds-muted uppercase tracking-wider mb-1">
                STAGE THREE
              </div>
              <h3 className="font-space text-[18px] text-ds-ink mb-1.5 font-bold">
                PUBLISH
              </h3>
              <p className="text-[12px] sm:text-[13px] text-ds-body leading-relaxed">
                Deploy with CDN velocity to global audiences. Sync instant registration data straight to credential printers.
              </p>
            </div>
          </div>
        </div>

        {/* Editorial Composition: Dominant Visual + Overlapping High-Fidelity Fragments */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Dominant Cinematic Photograph (7 Cols) */}
          <div
            className={`lg:col-span-7 relative rounded-2xl overflow-hidden shadow-lg border border-ds-line-strong/40 min-h-[440px] group transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDySdWutLYbDD_qLT-LGGc7zd53nZ-nb83NWb7yar_ejUekbaB1nVFfrpjc5Rqv6pXtwVmls-lELw716uG59MSTXYNIujQZugU9V8pBXYEtUGeTJ_4x4YiBqU7OykXlDex4E8LXC-T0fQt-XLhMlbgVjKUpt2a2ZHf-eorNoqGtDun6N1AET5yfvMjYOEBtGjDbx6fOoJMwrx8W25mJYoRMLyM3yhfghocwS_7kOPey_pzbHqDJCrqvMw')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ds-ink/90 via-ds-ink/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-ds-accent/80 backdrop-blur-sm text-[11px] font-jakarta font-semibold uppercase tracking-wider mb-2">
                Director's Suite
              </span>
              <h3 className="font-space text-2xl sm:text-[26px] font-bold mb-2 text-white">
                Unified Command Before Doors Open
              </h3>
              <p className="font-jakarta text-[13px] sm:text-[14px] text-[#E4DFFE] max-w-xl leading-relaxed">
                Every cue, speaker arrival status, and gate pass validator synchronized to the master clock in unified precision.
              </p>
            </div>
          </div>

          {/* Overlapping Real-World Production Fragments (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 font-jakarta">
            {/* Fragment 1: Badge Credential Craft */}
            <div
              className={`bg-white p-5 rounded-xl border border-ds-line-strong/30 flex items-center gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative border border-ds-line-strong/40">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDIltSnMmWcm76XPVmNdEp20bZisR20yvA7VqqCewEEBRI9ro01pUwlauAl7KR2E13GFxq4nhtz7MHaVptSWDzL5vO53EZobI3Zb9zWDN7tw5Rr3RJA0siVdQ8c5WjEzeez_fX4j28Ss1TUwyB8x8TM9GUEBuT4cFoHM85PEwjyxz8bZDnD1e0DibpiBIYX29J-jBuJMfrGUdeZD8zxeA-U_tBDblR45-Y-95qUHvs05dQ6-p1RA4aeow')`,
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-ds-accent uppercase tracking-wider">
                  Credentialing Engine
                </span>
                <h4 className="font-space text-[16px] text-ds-ink font-bold">
                  Bespoke Pass Architecture
                </h4>
                <p className="text-[12px] text-ds-body mt-1">
                  Cryptographic NFC encoding with instant wallet provisioning.
                </p>
              </div>
            </div>

            {/* Fragment 2: Venue Acoustic & Spatial Planning */}
            <div
              className={`bg-white p-5 rounded-xl border border-ds-line-strong/30 flex items-center gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '500ms' }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative border border-ds-line-strong/40">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDqbmovF0WAYJ_O4juPcGejfdf2NKhzubMJkvtqi5wHqUn0gOb2YXs0BoWtqW0uHighl0DockbL5RkHZHwvXumN8DTTry9qybSjCZBxIa4yGzTecHA_BE9t9E0_PndrPCuSuUHuYLN4zk80gSlzo4koOdWoqcdHNfcXVSBojn6iexhhxC3RZuWWJeGbUhm8G-9RPq15EGLEBfPipJE9XNpXZ89cYLCC6Phf7jspN14dOq7fEvy5aSK4Kg')`,
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-ds-accent uppercase tracking-wider">
                  Spatial CAD Intelligence
                </span>
                <h4 className="font-space text-[16px] text-ds-ink font-bold">
                  Dynamic Venue Footprints
                </h4>
                <p className="text-[12px] text-ds-body mt-1">
                  Real-time zone capacity limits and automated fire-code checks.
                </p>
              </div>
            </div>

            {/* Fragment 3: Speaker Schedule Coordination */}
            <div
              className={`bg-white p-5 rounded-xl border border-ds-line-strong/30 flex items-center gap-4 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative border border-ds-line-strong/40">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBRE2Plq0zL1AScKdUrdC2W00av5DTpHHWQbg7kJv8PzzsC76esIthBqlfK6nmUO0LutB87g7YIAhhvqf2-sZaj00zhNxsyTJOiAekSP8utwvifdy_hILt9tG3PJOu2mgSYCW1ZBV9_R55WSjiaSFskyWGiL_OXwP6jXlNhrZdfUcp6eGQaOZ8iN8-JsYYEdf5ejOyqfFwk8MTBGBZ8Es62Ap8I76mkNm4P0ybZX3Zee_qLEc4bpeNulw')`,
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-ds-accent uppercase tracking-wider">
                  Talent Sync
                </span>
                <h4 className="font-space text-[16px] text-ds-ink font-bold">
                  Speaker Readiness Flow
                </h4>
                <p className="text-[12px] text-ds-body mt-1">
                  Automatic SMS teleprompter callouts and green-room routing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
