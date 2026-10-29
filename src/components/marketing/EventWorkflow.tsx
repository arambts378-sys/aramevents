'use client';

import React from 'react';

const workflowSteps = [
  {
    step: '01',
    tag: 'CREATE',
    title: 'Event Setup',
    description: 'Configure ticketing tiers, capacity locks, and custom event rules in minutes.',
    icon: 'add_box',
  },
  {
    step: '02',
    tag: 'PUBLISH',
    title: 'Branded Site',
    description: 'Instant high-performance microsites with speaker rosters and domain sync.',
    icon: 'public',
  },
  {
    step: '03',
    tag: 'REGISTER',
    title: 'Checkout & Form',
    description: 'Multi-currency payments, custom conditional fields, and group checkouts.',
    icon: 'how_to_reg',
  },
  {
    step: '04',
    tag: 'MANAGE',
    title: 'Access Gates',
    description: 'Multi-track schedule management, badge design, and speaker coordination.',
    icon: 'confirmation_number',
  },
  {
    step: '05',
    tag: 'OPERATE',
    title: 'Live Scanning',
    description: '120ms turnstile sync, offline-resilient volunteer scanners, and access locks.',
    icon: 'qr_code_scanner',
  },
  {
    step: '06',
    tag: 'ANALYZE',
    title: 'Audit & Reports',
    description: 'Real-time ingress heatmaps, drop-off analytics, and verifiable records.',
    icon: 'analytics',
  },
];

export function EventWorkflow() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8 bg-white" id="workflow">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold text-ds-accent uppercase tracking-wider">End-to-End Orchestration</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-ds-body mt-1 tracking-tight">
          From Idea to Event Day.
        </h2>
        <p className="text-base text-ds-muted mt-2 font-normal">
          A unified lifecycle pipeline designed to eliminate fragmented point tools across your entire organization.
        </p>
      </div>

      {/* Pipeline Step Grid with Interconnecting Rail */}
      <div className="relative">
        {/* Hidden connection line on desktop */}
        <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-ds-accent-soft -translate-y-8 z-0" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
          {workflowSteps.map((item) => (
            <div
              key={item.step}
              className="bg-ds-canvas p-5 rounded-2xl border border-ds-line shadow-sm flex flex-col h-full hover:border-ds-accent/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-ds-accent font-bold text-base mb-4 border border-ds-line shadow-xs group-hover:bg-ds-accent group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-ds-accent">{item.step}</span>
                <span className="text-xs font-bold text-ds-accent">{item.tag}</span>
              </div>
              <h4 className="text-lg font-bold text-ds-body">{item.title}</h4>
              <p className="text-xs text-ds-muted mt-2 leading-relaxed font-normal">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
