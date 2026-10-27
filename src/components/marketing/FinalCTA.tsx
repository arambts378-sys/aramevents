'use client';

import React from 'react';
import Link from 'next/link';
import { useInView } from './useScrollReveal';

export function FinalCTA() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      className="relative py-32 bg-ds-ink overflow-hidden text-center select-none"
    >

      {/* Atmospheric Backdrop Event Scene with Cinematic Zoom */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 transform animate-cinematic-zoom pointer-events-none"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuB4v-a1XFMeuqrnjYjcsM9FEbvcPjzXWsxqNRz0m0YYi19mTlSNVFgRakYwXALHAGHRtrKBDgYQX5IdnuwwecuhcQO4o4yWwoymO-3nBU59l7gqthwOytxas2Gox5_X_PfhKPclfJw7K1bM-dSYE3A-9bhEu85rjhwGfZCFUFBMDDxM0rtv9V6sp7ZvIJQa2EVzz_WBFPtE9dizd2NQfmCBuyBwK8bMTRWcSWokYGeAQH33KwE9O6I4zA')`,
        }}
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-ds-ink via-transparent to-ds-ink pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, rgba(15, 14, 23, 0.7) 70%, #0F0E17 100%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 flex flex-col items-center">
        {/* Glow Badge */}
        <div
          className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-sm mb-8 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="font-jakarta text-[11px] font-bold text-white uppercase tracking-wider">
            DEPLOY YOUR NEXT PRODUCTION
          </span>
        </div>

        {/* Heading */}
        <h2
          className={`font-space text-4xl sm:text-5xl md:text-[60px] text-white tracking-tight mb-6 font-bold leading-[1.12] transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          Your event{' '}
          <span className="bg-gradient-to-r from-white via-ds-accent-soft to-[#C4B5FD] bg-clip-text text-transparent">
            starts here.
          </span>
        </h2>

        {/* Supporting Copy */}
        <p
          className={`font-jakarta text-[16px] sm:text-[18px] text-ds-line-strong max-w-xl text-balance mb-10 leading-relaxed font-normal transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          Create, manage and operate your next event with Aram Events. Join the world’s leading experiential directors and event teams.
        </p>

        {/* Primary & Secondary Actions */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <Link
            href="/app/events/new"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-ds-accent text-white font-bold text-[15px] shadow-sm shadow-sm active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 border border-white/20"
          >
            <span>Create Your Event</span>
            <span className="material-symbols-outlined text-[19px]">add_circle</span>
          </Link>
          <a
            href="#platform"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/35 backdrop-blur-xl font-bold text-[15px] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 shadow-lg shadow-black/30"
          >
            <span>Explore the Platform</span>
            <span className="material-symbols-outlined text-[19px]">open_in_new</span>
          </a>
        </div>

        {/* Bottom Tag */}
        <div
          className={`mt-12 font-jakarta text-[11px] font-semibold text-ds-muted tracking-wider uppercase transition-all duration-700 delay-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Enterprise Security Assured • ISO 27001 Certified • Multi-Region Resiliency
        </div>
      </div>
    </section>
  );
}
