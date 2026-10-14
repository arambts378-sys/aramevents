import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about ARAM Tickets, event tools for websites, registration, ticket management, QR check-in and analytics.',
};

export default function AboutUsPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#5B3FE8]">About</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#17152B] sm:text-5xl">
        Event work, brought together.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl leading-7 text-[#77738A]">
        ARAM Tickets gives event teams a workspace for event websites, registration and ticket
        management, people and program details, QR check-in, and event analytics.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#E6E2F0] bg-white px-6 text-sm font-semibold text-[#17152B] hover:bg-[#F7F5FF]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
