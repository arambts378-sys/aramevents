import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact information for ARAM Tickets will be published here once confirmed.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#5B3FE8]">Contact</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#17152B] sm:text-5xl">
        We are preparing our contact information.
      </h1>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-[#77738A]">
        Contact details will be published here once they are confirmed.
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
