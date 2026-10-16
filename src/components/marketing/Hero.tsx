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
      className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#11101A] select-none py-24"
    >
      {/* Background Cinematic Video with Controlled Vignette */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 pointer-events-none"
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Gradient / Vignette Overlays for Flawless Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#11101A] via-[#11101A]/20 to-[#11101A]/80 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(17, 16, 26, 0.2) 0%, rgba(17, 16, 26, 0.55) 60%, #11101A 100%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 w-full flex flex-col items-center text-center my-auto">
        {/* High-Impact Headline */}
        <h1
          className={`font-space text-5xl sm:text-6xl md:text-7xl lg:text-[84px] text-white tracking-tight leading-[1.08] max-w-5xl mb-8 font-extrabold drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          One platform. Every event.
        </h1>

        {/* Supporting Message - Enlarged and High Visibility */}
        <p
          className={`font-jakarta text-lg sm:text-xl md:text-[22px] text-[#F3F0FA] max-w-3xl leading-relaxed mb-12 font-medium drop-shadow-[0_2px_16px_rgba(0,0,0,0.8)] transition-all duration-700 delay-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Create, manage and operate your events from one connected platform. Engineered for arena productions, global corporate summits, and experiential festivals.
        </p>

        {/* CTAs - Enlarged with Premium Elevation */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link
            href="/app/events/new"
            className="w-full sm:w-auto px-10 py-4.5 rounded-xl bg-[#5F3ADD] hover:bg-[#6D4AF0] text-white font-bold text-[16px] shadow-xl shadow-[#5F3ADD]/35 hover:shadow-[#5F3ADD]/55 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2.5 hover:-translate-y-0.5"
          >
            <span>Create Your Event</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <a
            href="#solutions"
            className="w-full sm:w-auto px-10 py-4.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md font-bold text-[16px] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 shadow-lg shadow-black/20"
          >
            <span>Explore the Platform</span>
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </a>
        </div>
      </div>
    </section>
  );
}
