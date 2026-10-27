'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AramLogo } from '@/components/brand/AramLogo';

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
    <header className="sticky top-0 z-50 border-b border-ds-line/80 bg-white/80 backdrop-blur-xl shadow-sm transition-all">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          aria-label="Aram home"
          className="flex items-end gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          <AramLogo priority />
        </Link>

        {/* Center: Navigation Links */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1.5 md:flex font-jakarta bg-ds-canvas/80 p-1.5 rounded-full border border-ds-line/70 backdrop-blur-sm">
          {navigationLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-1.5 rounded-full text-[14px] font-semibold text-ds-ink transition-all duration-200 hover:text-ds-accent-strong hover:bg-white hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: Action CTAs */}
        <div className="hidden items-center gap-3 md:flex font-jakarta">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-ds-ink transition-all hover:bg-ds-accent/10 hover:text-ds-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          >
            Log in
          </Link>
          <Link
            href="/organizer/register"
            className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-ds-accent-strong transition-all bg-ds-accent/8 hover:bg-ds-accent/15 border border-ds-accent/20 hover:border-ds-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          >
            Create account
          </Link>
          <Link
            href="/app/events/new"
            className="group flex items-center gap-2 rounded-xl bg-ds-accent px-5 py-2.5 text-[14px] font-bold text-white shadow-md shadow-black/5 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-strong focus-visible:ring-offset-2"
          >
            <span className="material-symbols-outlined text-[19px] transition-transform group-hover:rotate-90 duration-300">add_circle</span>
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
          className="rounded-lg p-2 text-ds-ink transition-colors hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent md:hidden"
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
          className="border-t border-ds-line bg-white px-5 py-4 shadow-lg md:hidden animate-in slide-in-from-top-2 duration-200"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-3 text-sm font-medium text-ds-ink hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ds-line pt-3">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-lg border border-ds-line px-3 py-3 text-center text-sm font-semibold text-ds-ink hover:bg-ds-subtle"
              >
                Log in
              </Link>
              <Link
                href="/organizer/register"
                onClick={closeMobileMenu}
                className="rounded-lg border border-ds-line px-3 py-3 text-center text-sm font-semibold text-ds-accent-strong hover:bg-ds-subtle"
              >
                Create account
              </Link>
              <Link
                href="/app/events/new"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 rounded-lg bg-ds-accent px-3 py-3 text-center text-sm font-semibold text-white hover:bg-ds-accent-strong"
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
