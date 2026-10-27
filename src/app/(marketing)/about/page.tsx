import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Aram Events, event tools for websites, registration, ticket management, QR check-in and analytics.',
};

export default function AboutUsPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">About</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">
        Event work, brought together.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl leading-7 text-ds-muted">
        Aram Events gives event teams a workspace for event websites, registration and ticket
        management, people and program details, QR check-in, and event analytics.
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
