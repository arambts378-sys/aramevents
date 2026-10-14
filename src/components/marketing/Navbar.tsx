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
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 h-[72px] ${
        isScrolled
          ? 'bg-[#FCF8FF]/90 backdrop-blur-md border-b border-[#C9C4D8]/30 shadow-sm'
          : 'bg-[#FCF8FF]/85 backdrop-blur-md border-b border-[#C9C4D8]/30 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group active:scale-[0.98] transition-transform duration-150 ease-out select-none"
        >
          <span className="font-space text-[20px] font-bold text-[#1B192F] tracking-tight">
            ARAM BTS
          </span>
          <span className="w-2 h-2 rounded-full bg-[#5F3ADD] inline-block live-pulse"></span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 font-jakarta">
          <a
            href="#platform"
            className="text-[#5F3ADD] font-bold border-b-2 border-[#5F3ADD] py-1 text-[13px] tracking-wide transition-colors"
          >
            Platform
          </a>
          <a
            href="#solutions"
            className="text-[#484555] hover:text-[#1B192F] py-1 text-[13px] font-semibold tracking-wide transition-colors hover:text-[#5F3ADD] duration-150"
          >
            Solutions
          </a>
          <a
            href="#resources"
            className="text-[#484555] hover:text-[#1B192F] py-1 text-[13px] font-semibold tracking-wide transition-colors hover:text-[#5F3ADD] duration-150"
          >
            Resources
          </a>
        </nav>

        {/* Right: Action CTAs */}
        <div className="hidden md:flex items-center space-x-4 font-jakarta">
          <Link
            href="/login"
            className="text-[#484555] hover:text-[#5F3ADD] text-[13px] font-semibold px-3 py-2 transition-colors active:scale-[0.98]"
          >
            Login
          </Link>
          <Link
            href="/app/events/new"
            className="bg-[#5F3ADD] hover:bg-[#573AE4] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] flex items-center gap-1.5"
          >
            <span>Create Event</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#1B192F] hover:bg-[#F0EBFF] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FCF8FF] border-b border-[#C9C4D8]/30 px-6 py-5 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <a
            href="#platform"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-bold text-[#5F3ADD] py-1 font-jakarta"
          >
            Platform
          </a>
          <a
            href="#solutions"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#484555] hover:text-[#1B192F] py-1 font-jakarta"
          >
            Solutions
          </a>
          <a
            href="#resources"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#484555] hover:text-[#1B192F] py-1 font-jakarta"
          >
            Resources
          </a>
          <div className="pt-3 border-t border-[#C9C4D8]/30 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-sm font-semibold text-[#1B192F] border border-[#C9C4D8]/40 rounded-lg hover:bg-white"
            >
              Login
            </Link>
            <Link
              href="/app/events/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#5F3ADD] hover:bg-[#573AE4] rounded-lg shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Create Event</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
