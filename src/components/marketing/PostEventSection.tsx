'use client';

import React from 'react';

const closureStages = [
  {
    stage: 'STAGE 01',
    title: 'Check-in Data',
    description: 'Turnstile records compiled across all nodes.',
    badge: '1,926 Records Synced',
    badgeColor: 'text-[#22C55E]',
    icon: 'done_all',
  },
  {
    stage: 'STAGE 02',
    title: 'Reconciliation',
    description: 'Attendance verified vs registered badges.',
    badge: '100% Reconciled',
    badgeColor: 'text-[#7C5CFC]',
    icon: 'verified',
  },
  {
    stage: 'STAGE 03',
    title: 'Settlement',
    description: 'Automated payout split to sponsors & venues.',
    badge: 'Instant Payout',
    badgeColor: 'text-[#27243A]',
    icon: 'payments',
  },
  {
    stage: 'STAGE 04',
    title: 'Certificates',
    description: 'Tamper-proof verifiable credentials sent to wallets.',
    badge: 'Credential ID',
    badgeColor: 'text-[#7C5CFC]',
    isHighlighted: true,
    icon: 'workspace_premium',
  },
  {
    stage: 'STAGE 05',
    title: 'Event Record',
    description: 'Archived telemetry, survey feedback, and heatmaps.',
    badge: 'Permanent Storage',
    badgeColor: 'text-[#77738A]',
    icon: 'archive',
  },
];

export function PostEventSection() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8 bg-white">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold text-[#7C5CFC] uppercase tracking-wider">Lifecycle Closure</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#27243A] mt-1 tracking-tight">
          Post-Event. Fully Automated.
        </h2>
        <p className="text-base text-[#77738A] mt-2 font-normal">
          The event doesn&apos;t end when the doors close. ARAM BTS automatically reconciles financials, delivers verifiable certificates, and archives audit logs.
        </p>
      </div>

      {/* Sequential Flow Pipeline with Mini Previews */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {closureStages.map((st, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
              st.isHighlighted
                ? 'bg-[#F7F5FF] border-2 border-[#7C5CFC]/40 shadow-sm'
                : 'bg-[#F7F5FF] border-[#EDE9FE]'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-[#77738A] tracking-wider block">{st.stage}</span>
              <h5 className="text-base font-bold text-[#27243A] mt-1">{st.title}</h5>
              <p className="text-xs text-[#77738A] mt-1 leading-relaxed font-normal">{st.description}</p>
            </div>
            <div className={`mt-4 p-2.5 rounded-xl bg-white border border-[#EDE9FE] text-xs font-bold flex items-center justify-between ${st.badgeColor}`}>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">{st.icon}</span>
                {st.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
