import React from 'react';
import Link from 'next/link';
import { AramLogo } from '@/components/brand/AramLogo';

export function Footer() {
  return (
    <footer className="border-t border-ds-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <Link href="/" aria-label="Aram home" className="inline-flex">
            <AramLogo size="sm" />
          </Link>
          <p className="mt-2 text-xs text-ds-muted">
            © 2026 WisRight Technologies. All rights reserved.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <Link href="/#features" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Features
          </Link>
          <Link href="/#event-day" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Event day
          </Link>
          <Link href="/pricing" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Pricing
          </Link>
          <Link href="/contact" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Contact
          </Link>
          <Link href="/login" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Log in
          </Link>
          <Link href="/organizer/register" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Create account
          </Link>
          <Link href="/privacy" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Privacy Policy
          </Link>
          <Link href="/terms" className="py-1 text-sm text-ds-muted hover:text-ds-ink">
            Terms and Conditions
          </Link>
        </nav>
      </div>
    </footer>
  );
}
