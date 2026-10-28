import React from 'react';
import Link from 'next/link';
import { AramLogo } from '@/components/brand/AramLogo';
import { SITE_NAV } from '@/lib/site';

const GROUPS = [
  { title: 'Product', links: SITE_NAV.slice(0, 4) },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/security', label: 'Security' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Log in' },
      { href: '/organizer/register', label: 'Create account' },
      { href: '/forgot-password', label: 'Reset password' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms and conditions' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-mk-line bg-white">
      <div className="mk-container grid gap-12 py-14 lg:grid-cols-[1fr_2fr]">
        <div>
          <Link href="/" aria-label="Aram Events home" className="mk-focus inline-block">
            <AramLogo />
          </Link>
          <p className="mt-4 max-w-[18rem] text-[0.9375rem] leading-[1.6] text-mk-muted">
            Event websites, registration, QR check-in and attendee records for event teams.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="text-[0.875rem] font-semibold text-mk-ink">{g.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="mk-focus text-[0.9375rem] text-mk-muted hover:text-mk-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-mk-line">
        <p className="mk-container py-5 text-[0.8125rem] text-mk-muted">
          © {new Date().getFullYear()} WisRight Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
