'use client';

import React from 'react';
import { useInView, AnimatedCounter } from './useScrollReveal';

export function PeopleDataSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="resources"
      className="py-24 bg-ds-subtle relative border-b border-ds-line-strong/30 select-none"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ds-accent-soft border border-ds-line-strong/40 mb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="font-jakarta text-[11px] font-semibold text-ds-accent uppercase tracking-wider">
              Measurable Human Impact
            </span>
          </div>

          <h2
            className={`font-space text-3xl sm:text-4xl lg:text-[40px] text-ds-ink tracking-tight mb-4 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Events are about people. Data makes them better.
          </h2>

          <p
            className={`font-jakarta text-[15px] sm:text-[16px] text-ds-body leading-relaxed transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Capture meaningful engagement without intrusive friction. Turn experiential moments into durable institutional value.
          </p>
        </div>

        {/* Visual Progression Strip: EVENT -> ACTIVITY -> DATA -> INSIGHT -> OUTCOME */}
        <div
          className={`mb-16 bg-white border border-ds-line-strong/30 rounded-2xl p-6 lg:p-8 shadow-sm font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
            {/* 01 // SOURCE */}
            <div className="text-center p-3">
              <div className="text-[11px] font-bold text-ds-accent uppercase tracking-wider font-jakarta">
                01 // SOURCE
              </div>
              <div className="font-space text-[18px] font-bold text-ds-ink mt-1">
                EVENT
              </div>
              <p className="text-[12px] text-ds-body mt-1">
                Arena Keynotes, Labs &amp; Summits
              </p>
            </div>

            {/* 02 // PULSE */}
            <div className="text-center p-3 relative">
              <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-ds-line-strong font-bold">
                →
              </div>
              <div className="text-[11px] font-bold text-ds-accent uppercase tracking-wider font-jakarta">
                02 // PULSE
              </div>
              <div className="font-space text-[18px] font-bold text-ds-ink mt-1">
                ACTIVITY
              </div>
              <p className="text-[12px] text-ds-body mt-1">
                Dwell, Interactions, Session Q&amp;A
              </p>
            </div>

            {/* 03 // STREAM */}
            <div className="text-center p-3 relative">
              <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-ds-line-strong font-bold">
                →
              </div>
              <div className="text-[11px] font-bold text-ds-accent uppercase tracking-wider font-jakarta">
                03 // STREAM
              </div>
              <div className="font-space text-[18px] font-bold text-ds-ink mt-1">
                DATA
              </div>
              <p className="text-[12px] text-ds-body mt-1">
                Telemetry, RFID Taps &amp; Lead Exchange
              </p>
            </div>

            {/* 04 // SYNTHESIS */}
            <div className="text-center p-3 relative">
              <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-ds-line-strong font-bold">
                →
              </div>
              <div className="text-[11px] font-bold text-ds-accent uppercase tracking-wider font-jakarta">
                04 // SYNTHESIS
              </div>
              <div className="font-space text-[18px] font-bold text-ds-ink mt-1">
                INSIGHT
              </div>
              <p className="text-[12px] text-ds-body mt-1">
                Heatmap Clusters &amp; Topic Affinity
              </p>
            </div>

            {/* 05 // VALUE */}
            <div className="text-center p-3 relative col-span-2 md:col-span-1">
              <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-ds-line-strong font-bold">
                →
              </div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider font-jakarta">
                05 // VALUE
              </div>
              <div className="font-space text-[18px] font-bold text-ds-ink mt-1">
                OUTCOME
              </div>
              <p className="text-[12px] text-ds-body mt-1">
                Re-booking &amp; ROI Attribution
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Editorial Grid: Human Photography + Outcome Deliverables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Column 1: Human Moments Photography Mosaic (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Image 1: Audience Immersion */}
            <div
              className={`rounded-xl overflow-hidden h-72 relative border border-ds-line-strong/30 group shadow-sm transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
              }`}
              style={{ transitionDelay: '350ms' }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCsZoLRYOhlrKNJuk61SjvtgyJbvQ8uj58GdFn5I9LTU_JigRu_DnT7oiFrRAYdxJOmIiW2rBQNnvVGFboJ72q7uMzI6nCrByRPiyUh9JGsNVk49PWdqkw3Fb0xWDmbJhtcY-8mVuuDGPJL9wAI-A_lrVFfmi9DoXl361kyerqDNneJgqTakT9OsGc0RbaHVK7jkjSVm0_samG-uZ1eKwX6Gei6I3nkvdXAAXj3Zbz88DgF4_8Ua74xww')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ds-ink/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                <span className="text-white font-space text-[18px] font-semibold">
                  <AnimatedCounter end={98.4} decimals={1} suffix="%" /> Audience Retention
                </span>
                <span className="text-[#E4DFFE] font-jakarta text-[12px]">
                  Main Stage Keynote Velocity
                </span>
              </div>
            </div>

            {/* Image 2: Workshop & Networking Engagement */}
            <div
              className={`rounded-xl overflow-hidden h-72 relative border border-ds-line-strong/30 group shadow-sm transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
              }`}
              style={{ transitionDelay: '450ms' }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA6zDqnivjGaBz6TTJykfF9-BMPjRPWAP03WCVKxC3d7shtR2-wj1BOQ9PHBWad8lhH3LOU9f_1LxBi2NXqPfQ-53x-W2OBFBTfVCpUEtN7NNLVoDHUo4-b7rRXxZzvyflfCecm_gKA7_rdVX4Ffh5zcuwTdffEDAaJCuZCOAG1_Hh1WpwCsHdDr5dbNd1JrJD0Ff_IxtesmwS5Y7YX9Pfa-bquum7vS9k06W7vGc-U4YKSmW9soAle2Q')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ds-ink/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                <span className="text-white font-space text-[18px] font-semibold">
                  <AnimatedCounter end={4.2} decimals={1} suffix="x" /> Peer Connections
                </span>
                <span className="text-[#E4DFFE] font-jakarta text-[12px]">
                  Verified Smart Badge Exchanges
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Compact Outcome Deliverables (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 font-jakarta">
            {/* Deliverable 1 */}
            <div
              className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
              <h3 className="font-space text-[18px] font-bold text-ds-ink mb-1">
                Instant Automated Accreditation
              </h3>
              <p className="text-[13px] text-ds-body leading-relaxed">
                Eliminate 48-hour post-event credential audits. CME, CPD, and professional certifications issued automatically at badge departure.
              </p>
            </div>

            {/* Deliverable 2 */}
            <div
              className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '500ms' }}
            >
              <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[20px]">summarize</span>
              </div>
              <h3 className="font-space text-[18px] font-bold text-ds-ink mb-1">
                Executive Insight Dossiers
              </h3>
              <p className="text-[13px] text-ds-body leading-relaxed">
                Boardroom-ready performance decks generated instantly with dwell duration metrics, topic demand graphs, and sponsor ROI values.
              </p>
            </div>

            {/* Deliverable 3 */}
            <div
              className={`bg-white p-6 rounded-xl border border-ds-line-strong/30 shadow-sm hover:border-ds-accent/50 transition-all duration-300 hover:-translate-y-0.5 ${
                isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <div className="w-10 h-10 rounded-lg bg-ds-accent-soft text-ds-accent flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[20px]">query_stats</span>
              </div>
              <h3 className="font-space text-[18px] font-bold text-ds-ink mb-1">
                Strategic Planning Models
              </h3>
              <p className="text-[13px] text-ds-body leading-relaxed">
                Feed actual movement data directly into future year capacity planning, catering allocations, and room layout choices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
