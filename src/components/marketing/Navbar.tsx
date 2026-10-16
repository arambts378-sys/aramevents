'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const navigationLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#event-day', label: 'Event day' },
  { href: '/pricing', label: 'Pricing' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E6E2F0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          aria-label="ARAM BTS home"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5F3ADD] to-[#7C5CFC] flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[19px]">deployed_code</span>
          </div>
          <span className="font-space text-[22px] font-bold text-[#17152B] tracking-tight">
            ARAM <span className="text-[#7C5CFC]">BTS</span>
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block animate-pulse"></span>
        </Link>

        {/* Center: Navigation Links */}
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex font-jakarta">
          {navigationLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[15px] font-semibold text-[#2D2A3E] transition-colors hover:text-[#5F3ADD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: Action CTAs */}
        <div className="hidden items-center gap-3 md:flex font-jakarta">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-[15px] font-bold text-[#17152B] transition-colors hover:bg-[#5F3ADD]/10 hover:text-[#5F3ADD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          >
            Log in
          </Link>
          <Link
            href="/organizer/register"
            className="rounded-xl px-4 py-2.5 text-[15px] font-bold text-[#5B3FE8] transition-colors hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          >
            Create account
          </Link>
          <Link
            href="/app/events/new"
            className="flex items-center gap-2 rounded-xl bg-[#5F3ADD] px-5 py-2.5 text-[15px] font-bold text-white shadow-md shadow-[#5F3ADD]/25 transition-all hover:bg-[#4E2ECC] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FE8] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[19px]">add_circle</span>
            <span>Create event</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-lg p-2 text-[#17152B] transition-colors hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] md:hidden"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-[#E6E2F0] bg-white px-5 py-4 shadow-lg md:hidden animate-in slide-in-from-top-2 duration-200"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#17152B] hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[#E6E2F0] pt-3">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-lg border border-[#E6E2F0] px-3 py-3 text-center text-sm font-semibold text-[#17152B] hover:bg-[#F7F5FF]"
              >
                Log in
              </Link>
              <Link
                href="/organizer/register"
                onClick={closeMobileMenu}
                className="rounded-lg border border-[#E6E2F0] px-3 py-3 text-center text-sm font-semibold text-[#5B3FE8] hover:bg-[#F7F5FF]"
              >
                Create account
              </Link>
              <Link
                href="/app/events/new"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#5F3ADD] px-3 py-3 text-center text-sm font-semibold text-white hover:bg-[#4E2ECC]"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Create event</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
