'use client';

import React from 'react';

export function PublishEventPreview() {
  return (
    <section className="py-24 bg-ds-ink text-white relative overflow-hidden">
      {/* Atmospheric Violet Ambient Glow */}

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-[#EDE9FE] uppercase tracking-wider">02 / PUBLISH</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-1 tracking-tight">
            Your Event Gets a Home.
          </h2>
          <p className="text-base text-ds-muted mt-2 font-normal">
            Aram Events generates high-converting branded event landing pages instantly with your domains, schedules, and custom ticketing widgets.
          </p>
        </div>

        {/* Large Safari Browser Mockup */}
        <div className="w-full rounded-2xl overflow-hidden border border-ds-muted/30 bg-white/5 backdrop-blur-md shadow-2xl">
          {/* Browser Chrome Header Bar */}
          <div className="h-12 bg-ds-ink/90 border-b border-ds-muted/20 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            </div>
            <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-ds-ink border border-ds-muted/30 text-xs text-ds-muted w-80 justify-center">
              <span className="material-symbols-outlined text-xs text-[#22C55E]">lock</span>
              <span className="font-mono text-white/90">https://summit2026.futuretech.org</span>
            </div>
            <div className="flex items-center gap-2 text-ds-muted">
              <span className="material-symbols-outlined text-sm">share</span>
              <span className="material-symbols-outlined text-sm">more_vert</span>
            </div>
          </div>

          {/* Rendered Microsite Canvas Inside Browser Shell */}
          <div className="p-8 md:p-12 bg-white text-ds-body">
            <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-ds-accent-soft text-ds-accent font-bold text-xs">
                <span className="material-symbols-outlined text-xs">event</span> NOVEMBER 15-18, 2026 • TECH DISTRICT CONVENTION CENTRE
              </div>

              <h3 className="text-3xl sm:text-4xl font-bold text-ds-body max-w-2xl leading-tight">
                Future of Innovation 2026: Technology • People • Possibilities
              </h3>

              <p className="text-base text-ds-muted max-w-xl font-normal">
                Join 2,500+ world-class founders, engineers, and designers across 4 stages, 32 workshops, and the global autonomous expo.
              </p>

              {/* Countdown Timer Blocks */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4 my-2">
                <div className="bg-ds-canvas p-3 rounded-xl min-w-[70px] border border-ds-line">
                  <div className="text-xl sm:text-2xl font-bold text-ds-accent font-mono">48</div>
                  <div className="text-[11px] text-ds-muted font-medium">Days</div>
                </div>
                <div className="bg-ds-canvas p-3 rounded-xl min-w-[70px] border border-ds-line">
                  <div className="text-xl sm:text-2xl font-bold text-ds-accent font-mono">14</div>
                  <div className="text-[11px] text-ds-muted font-medium">Hours</div>
                </div>
                <div className="bg-ds-canvas p-3 rounded-xl min-w-[70px] border border-ds-line">
                  <div className="text-xl sm:text-2xl font-bold text-ds-accent font-mono">32</div>
                  <div className="text-[11px] text-ds-muted font-medium">Minutes</div>
                </div>
                <div className="bg-ds-canvas p-3 rounded-xl min-w-[70px] border border-ds-line">
                  <div className="text-xl sm:text-2xl font-bold text-ds-accent font-mono">09</div>
                  <div className="text-[11px] text-ds-muted font-medium">Seconds</div>
                </div>
              </div>

              {/* Keynote Speakers Avatars Row */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-ds-accent text-white flex items-center justify-center font-bold text-xs border-2 border-white">
                    AK
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ds-accent-strong text-white flex items-center justify-center font-bold text-xs border-2 border-white">
                    MR
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ds-ink text-white flex items-center justify-center font-bold text-xs border-2 border-white">
                    SJ
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ds-muted text-white flex items-center justify-center font-bold text-xs border-2 border-white">
                    +18
                  </div>
                </div>
                <span className="text-xs text-ds-muted font-semibold">
                  Keynotes by Horizon Labs, NeuralFlow & Vector Systems
                </span>
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <span className="bg-ds-accent hover:bg-ds-accent-strong text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors">
                  Register Now ($199)
                </span>
                <span className="bg-ds-canvas hover:bg-ds-subtle text-ds-body px-6 py-3.5 rounded-xl text-sm font-semibold border border-ds-line cursor-pointer transition-colors">
                  View Agenda
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
