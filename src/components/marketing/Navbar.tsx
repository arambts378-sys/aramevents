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
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          onClick={closeMobileMenu}
          aria-label="ARAM Tickets home"
          className="rounded-sm text-xl font-bold tracking-tight text-[#17152B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
        >
          ARAM <span className="text-[#7C5CFC]">Tickets</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navigationLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-[#77738A] transition-colors hover:text-[#17152B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#17152B] transition-colors hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          >
            Log in
          </Link>
          <Link
            href="/organizer/register"
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#5B3FE8] transition-colors hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          >
            Create account
          </Link>
          <Link
            href="/app/events/new"
            className="rounded-lg bg-[#7C5CFC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FE8] focus-visible:ring-offset-2"
          >
            Create event
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-lg p-2 text-[#17152B] transition-colors hover:bg-[#F7F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] md:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {mobileMenuOpen ? '×' : '☰'}
          </span>
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-[#E6E2F0] bg-white px-5 py-4 shadow-lg md:hidden"
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
                className="rounded-lg bg-[#7C5CFC] px-3 py-3 text-center text-sm font-semibold text-white hover:bg-[#5B3FE8]"
              >
                Create event
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
