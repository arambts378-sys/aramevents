'use client';

import React from 'react';

export function AnalyticsSection() {
  return (
    <section className="py-24 bg-[#F7F5FF] max-w-7xl mx-auto px-6 lg:px-8" id="analyze">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
        <div>
          <span className="text-xs font-bold text-[#7C5CFC] uppercase tracking-wider">05 / ANALYZE</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#27243A] mt-1 tracking-tight">
            Turn Event Data Into Insights.
          </h2>
          <p className="text-base text-[#77738A] mt-2 max-w-xl font-normal">
            Automated post-event reconciliation, drop-off analytics, and revenue attribution across every cohort.
          </p>
        </div>

        {/* Export Action Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-4 py-2.5 rounded-xl border border-[#EDE9FE] bg-white text-[#27243A] hover:bg-[#F7F5FF] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs">
            <span className="material-symbols-outlined text-sm">file_download</span> CSV Export
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-[#EDE9FE] bg-white text-[#27243A] hover:bg-[#F7F5FF] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs">
            <span className="material-symbols-outlined text-sm">table_view</span> Excel Sheet
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Audit PDF
          </button>
        </div>
      </div>

      {/* Executive Dashboard Shell */}
      <div className="bg-white rounded-3xl border border-[#EDE9FE] p-6 md:p-8 shadow-sm">
        {/* Top 4 Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#EDE9FE]">
            <span className="text-xs text-[#77738A]">Total Registrations</span>
            <div className="text-2xl font-bold text-[#27243A] mt-1 font-mono">2,480</div>
            <div className="text-xs text-[#22C55E] flex items-center gap-1 mt-1 font-bold">
              <span className="material-symbols-outlined text-xs">arrow_upward</span> +18.4% vs 2025
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#EDE9FE]">
            <span className="text-xs text-[#77738A]">Checked-in Attendance</span>
            <div className="text-2xl font-bold text-[#7C5CFC] mt-1 font-mono">1,926</div>
            <div className="text-xs text-[#77738A] flex items-center gap-1 mt-1 font-semibold">
              <span>77.6% Show-up Rate</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#EDE9FE]">
            <span className="text-xs text-[#77738A]">Sessions Tracked</span>
            <div className="text-2xl font-bold text-[#27243A] mt-1 font-mono">42</div>
            <div className="text-xs text-[#5B3FE8] flex items-center gap-1 mt-1 font-semibold">
              <span>100% Capacity Logged</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#EDE9FE]">
            <span className="text-xs text-[#77738A]">Drop-off Rate</span>
            <div className="text-2xl font-bold text-[#27243A] mt-1 font-mono">3.2%</div>
            <div className="text-xs text-[#22C55E] flex items-center gap-1 mt-1 font-bold">
              <span className="material-symbols-outlined text-xs">arrow_downward</span> Industry Best: &lt;5%
            </div>
          </div>
        </div>

        {/* Cohort Breakdown & Session Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Ticket Tier Ingress Distribution */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <h4 className="text-base font-bold text-[#27243A]">Ingress by Ticket Tier</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#27243A]">VIP All-Access Pass (500 limit)</span>
                  <span className="font-mono text-[#77738A]">488 Checked In (97.6%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F5FF]">
                  <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: '97.6%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#27243A]">General Delegate Pass (1,600 limit)</span>
                  <span className="font-mono text-[#77738A]">1,210 Checked In (75.6%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F5FF]">
                  <div className="h-full bg-[#5B3FE8] rounded-full" style={{ width: '75.6%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#27243A]">Speaker & Executive Pass (120 limit)</span>
                  <span className="font-mono text-[#77738A]">118 Checked In (98.3%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F5FF]">
                  <div className="h-full bg-[#22C55E] rounded-full" style={{ width: '98.3%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#27243A]">Press & Media Credentials (60 limit)</span>
                  <span className="font-mono text-[#77738A]">54 Checked In (90.0%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F5FF]">
                  <div className="h-full bg-[#77738A] rounded-full" style={{ width: '90.0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Session Attendance Engagement */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <h4 className="text-base font-bold text-[#27243A]">Top Attended Tracks</h4>
            <div className="space-y-3 bg-[#F7F5FF] p-4 rounded-2xl border border-[#EDE9FE]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#27243A]">Opening Keynote: Autonomous AI</div>
                  <div className="text-[11px] text-[#77738A]">Main Hall • 09:00 AM</div>
                </div>
                <span className="text-xs font-bold text-[#22C55E] bg-[#22C55E]/15 px-2.5 py-1 rounded-md">
                  1,480 Attendees
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#EDE9FE] pt-2.5">
                <div>
                  <div className="text-xs font-bold text-[#27243A]">Panel: Enterprise Cloud Security 2027</div>
                  <div className="text-[11px] text-[#77738A]">Stage 2 • 11:30 AM</div>
                </div>
                <span className="text-xs font-bold text-[#7C5CFC] bg-[#7C5CFC]/15 px-2.5 py-1 rounded-md">
                  820 Attendees
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#EDE9FE] pt-2.5">
                <div>
                  <div className="text-xs font-bold text-[#27243A]">Workshop: Deep Learning on Edge Devices</div>
                  <div className="text-[11px] text-[#77738A]">Lab 4 • 02:00 PM</div>
                </div>
                <span className="text-xs font-bold text-[#5B3FE8] bg-[#5B3FE8]/15 px-2.5 py-1 rounded-md">
                  210 Attendees
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
