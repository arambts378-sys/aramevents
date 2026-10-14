'use client';

import React from 'react';
import Link from 'next/link';
import { useInView, AnimatedCounter } from './useScrollReveal';

export function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      id="platform"
      className="relative min-h-[920px] flex items-center justify-center overflow-hidden bg-[#11101A] select-none"
    >
      {/* Background Cinematic Image with Controlled Vignette & Zoom */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transform animate-cinematic-zoom pointer-events-none"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpyCCCGBaNS9Nk0PPcNOteL6JesIV6IR-OrFY9eNiUT5xT2aLlrLJGaSjzsTmXpWNwhFMMJXB1tLoVzAgddUGAfvOnzJ2VEYpos-wAFW_0muqpPRR3xRkW2fu9So49pp0q71RsdREXToKc6Ft1Bra5_lst-9S8VMz46w-NbzlMh3qErFtz63iaAtpzjbncxbF0P7PC_jV6ZWZ6JexqshdVCUFg7eNdRU24FoCPfNASsaohL9Ey99hmpQ')`,
        }}
      />

      {/* Gradient / Vignette Overlays for Flawless Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#11101A] via-transparent to-[#11101A]/80 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(17, 16, 26, 0.4) 60%, #11101A 100%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24 w-full flex flex-col items-center text-center mt-12 md:mt-6">
        {/* Subdued Live Indicator */}
        <div
          className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#5F3ADD] live-pulse" />
          <span className="font-jakarta text-[11px] font-semibold text-[#E4DFFE] tracking-wider uppercase">
            ARAM EVENT OS 2025 // GLOBAL PRODUCTION STANDARD
          </span>
        </div>

        {/* Compact, High-Impact Headline */}
        <h1
          className={`font-space text-4xl sm:text-5xl md:text-[56px] text-white tracking-tight leading-[1.14] max-w-4xl mb-6 font-bold transition-all duration-700 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          One platform. Every event.
        </h1>

        {/* Supporting Message */}
        <p
          className={`font-jakarta text-[15px] sm:text-[16px] text-[#C9C4D8] max-w-2xl leading-relaxed mb-10 font-normal transition-all duration-700 delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          Create, manage and operate your events from one connected platform. Engineered for arena productions, global corporate summits, and experiential festivals.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto font-jakarta transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <Link
            href="/app/events/new"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#5F3ADD] hover:bg-[#573AE4] text-white font-semibold text-[13px] shadow-lg shadow-[#5F3ADD]/25 hover:shadow-[#5F3ADD]/40 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <span>Create Your Event</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <a
            href="#solutions"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm font-semibold text-[13px] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <span>Explore the Platform</span>
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </a>
        </div>

        {/* Micro Telemetry Ticker Bottom of Hero */}
        <div
          className={`mt-16 pt-8 border-t border-white/10 w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4 text-left transition-all duration-700 delay-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="px-3">
            <div className="font-jakarta text-[11px] font-semibold text-[#C9C4D8] uppercase tracking-wider">
              UPTIME SLA
            </div>
            <div className="font-space text-[18px] sm:text-[20px] text-white font-bold mt-1">
              <AnimatedCounter end={99.995} decimals={3} suffix="%" />
            </div>
          </div>
          <div className="px-3">
            <div className="font-jakarta text-[11px] font-semibold text-[#C9C4D8] uppercase tracking-wider">
              LATENCY
            </div>
            <div className="font-space text-[18px] sm:text-[20px] text-white font-bold mt-1">
              &lt; 14ms Global
            </div>
          </div>
          <div className="px-3">
            <div className="font-jakarta text-[11px] font-semibold text-[#C9C4D8] uppercase tracking-wider">
              SCAN CAPACITY
            </div>
            <div className="font-space text-[18px] sm:text-[20px] text-white font-bold mt-1">
              12k / min / gate
            </div>
          </div>
          <div className="px-3">
            <div className="font-jakarta text-[11px] font-semibold text-[#C9C4D8] uppercase tracking-wider">
              ENCRYPTION
            </div>
            <div className="font-space text-[18px] sm:text-[20px] text-white font-bold mt-1">
              Post-Quantum
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
