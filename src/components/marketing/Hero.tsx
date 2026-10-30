'use client';

import React from 'react';
import Link from 'next/link';
import { useInView } from './useScrollReveal';

export function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      id="platform"
      className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-stage-night select-none py-24"
    >
      {/* Background Cinematic Video with Controlled Vignette */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 pointer-events-none"
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>


      {/* Gradient / Vignette Overlays for Flawless Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-stage-night via-stage-night/30 to-stage-night/85 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(27, 16, 53, 0.1) 0%, rgba(27, 16, 53, 0.6) 65%, #1B1035 100%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 w-full flex flex-col items-center text-center my-auto">
        {/* High-Impact Headline with Gradient Sheen */}
        <h1
          className={`font-display text-5xl sm:text-6xl lg:text-[72px] text-white tracking-[0.01em] leading-[1.06] max-w-5xl mb-8 font-bold drop-shadow-[0_2px_24px_rgba(10,6,30,0.55)] transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          One platform{' '}
          <span className="bg-gradient-to-r from-[#FFE9B8] via-[#FFD27A] to-[#FFC24D] bg-clip-text text-transparent">
            for all events.
          </span>
        </h1>

        {/* Supporting Message - Enlarged and High Visibility */}
        <p
          className={`font-jakarta text-lg sm:text-xl md:text-[22px] text-white/90 max-w-3xl leading-relaxed mb-10 font-medium drop-shadow-[0_1px_12px_rgba(10,6,30,0.6)] transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Create, manage and operate your events from one connected platform. Engineered for arena productions, global corporate summits, and experiential festivals.
        </p>

        {/* CTAs - Enlarged with Premium Elevation */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full sm:w-auto font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link
            href="/app/events/new"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-stage-lamp hover:bg-[#FFD27A] text-stage-ink font-bold text-[16px] shadow-[0_10px_30px_-10px_rgba(255,200,97,0.7)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 border border-white/20"
          >
            <span>Create your event</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <a
            href="#solutions"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/35 hover:border-white/55 backdrop-blur-xl font-bold text-[16px] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 shadow-lg shadow-black/30"
          >
            <span>Explore the platform</span>
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </a>
        </div>

      </div>
    </section>
  );
}
