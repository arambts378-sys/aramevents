'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 h-[78px] ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E6E2F0] shadow-sm'
          : 'bg-[#FCF8FF]/95 backdrop-blur-md border-b border-[#E6E2F0]/80 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group active:scale-[0.98] transition-transform duration-150 ease-out select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5F3ADD] to-[#7C5CFC] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-[19px]">deployed_code</span>
          </div>
          <span className="font-space text-[22px] font-bold text-[#17152B] tracking-tight">
            ARAM BTS
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block animate-pulse"></span>
        </Link>

        {/* Center: Navigation Links - Enlarged & High Contrast */}
        <nav className="hidden md:flex items-center space-x-10 font-jakarta">
          <a
            href="#platform"
            className="text-[#5F3ADD] font-bold border-b-2 border-[#5F3ADD] pb-1.5 text-[15px] tracking-wide transition-colors"
          >
            Platform
          </a>
          <a
            href="#solutions"
            className="text-[#2D2A3E] hover:text-[#5F3ADD] py-1 text-[15px] font-semibold tracking-wide transition-colors duration-150"
          >
            Solutions
          </a>
          <a
            href="#resources"
            className="text-[#2D2A3E] hover:text-[#5F3ADD] py-1 text-[15px] font-semibold tracking-wide transition-colors duration-150"
          >
            Resources
          </a>
        </nav>

        {/* Right: Action CTAs - Enlarged & Clearly Visible */}
        <div className="hidden md:flex items-center space-x-3.5 font-jakarta">
          <Link
            href="/login"
            className="text-[#17152B] hover:text-[#5F3ADD] text-[15px] font-bold px-4 py-2.5 rounded-xl hover:bg-[#5F3ADD]/10 transition-colors active:scale-[0.98]"
          >
            Login
          </Link>
          <Link
            href="/app/events/new"
            className="bg-[#5F3ADD] hover:bg-[#4E2ECC] text-white text-[15px] font-bold px-6 py-2.5 rounded-xl shadow-md shadow-[#5F3ADD]/25 hover:shadow-lg hover:shadow-[#5F3ADD]/35 transition-all duration-150 active:scale-[0.98] flex items-center gap-2 hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[19px]">add_circle</span>
            <span>Create Event</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2.5 rounded-xl text-[#17152B] hover:bg-[#F0EBFF] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E6E2F0] px-6 py-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <a
            href="#platform"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[16px] font-bold text-[#5F3ADD] py-1.5 font-jakarta"
          >
            Platform
          </a>
          <a
            href="#solutions"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[16px] font-semibold text-[#17152B] hover:text-[#5F3ADD] py-1.5 font-jakarta"
          >
            Solutions
          </a>
          <a
            href="#resources"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[16px] font-semibold text-[#17152B] hover:text-[#5F3ADD] py-1.5 font-jakarta"
          >
            Resources
          </a>
          <div className="pt-4 border-t border-[#E6E2F0] flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 text-[15px] font-bold text-[#17152B] border border-[#E6E2F0] rounded-xl hover:bg-[#F7F5FF] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/app/events/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 text-[15px] font-bold text-white bg-[#5F3ADD] hover:bg-[#4E2ECC] rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Event</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
