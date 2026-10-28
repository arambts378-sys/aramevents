'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AramLogo } from '@/components/brand/AramLogo';
import { SITE_NAV } from '@/lib/site';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-mk-line/80 bg-mk-paper/85 backdrop-blur-xl">
      <div className="mk-container flex h-[68px] items-center justify-between gap-6">
        <Link href="/" aria-label="Aram Events home" className="mk-focus shrink-0">
          <AramLogo priority />
        </Link>

        <nav aria-label="Main navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {SITE_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={`mk-focus rounded-lg px-3 py-2 text-[0.9375rem] font-medium transition-colors ${
                    isActive(href) ? 'text-mk-violet-strong' : 'text-mk-body hover:text-mk-ink'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="mk-focus rounded-xl px-4 py-2.5 text-[0.9375rem] font-semibold text-mk-ink hover:bg-mk-lilac">
            Log in
          </Link>
          <Link
            href="/organizer/register"
            className="mk-focus rounded-xl bg-mk-violet px-4 py-2.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-mk-violet-strong"
          >
            Create account
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/login" className="mk-focus rounded-xl px-3 py-2 text-[0.9375rem] font-semibold text-mk-ink">
            Log in
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="mk-focus grid h-10 w-10 place-items-center rounded-xl border border-mk-line bg-white text-mk-ink"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
              {mobileMenuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-mk-line bg-mk-paper lg:hidden">
          <ul className="mk-container py-3">
            {SITE_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={`mk-focus block rounded-lg px-3 py-3 text-[1rem] font-medium ${
                    isActive(href) ? 'text-mk-violet-strong' : 'text-mk-ink'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="mt-3 border-t border-mk-line pt-4">
              <Link
                href="/organizer/register"
                onClick={() => setMobileMenuOpen(false)}
                className="mk-focus flex min-h-12 items-center justify-center rounded-xl bg-mk-violet text-[1rem] font-semibold text-white"
              >
                Create account
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
