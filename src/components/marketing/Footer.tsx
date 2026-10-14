import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#E6E2F0] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <Link href="/" className="text-lg font-bold tracking-tight text-[#17152B]">
            ARAM <span className="text-[#7C5CFC]">Tickets</span>
          </Link>
          <p className="mt-2 text-xs text-[#77738A]">
            © 2026 WisRight Technologies. All rights reserved.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <Link href="/#features" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Features
          </Link>
          <Link href="/#event-day" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Event day
          </Link>
          <Link href="/pricing" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Pricing
          </Link>
          <Link href="/contact" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Contact
          </Link>
          <Link href="/login" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Log in
          </Link>
          <Link href="/organizer/register" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Create account
          </Link>
          <Link href="/privacy" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="py-1 text-sm text-[#77738A] hover:text-[#17152B]">
            Terms and Conditions
          </Link>
        </nav>
      </div>
    </footer>
  );
}
