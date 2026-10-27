import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact information for Aram Events will be published here once confirmed.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">Contact</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">
        We are preparing our contact information.
      </h1>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
        Contact details will be published here once they are confirmed.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-ds-line bg-white px-6 text-sm font-semibold text-ds-ink hover:bg-ds-subtle"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
