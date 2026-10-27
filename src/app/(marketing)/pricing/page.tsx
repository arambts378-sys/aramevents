import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Public ARAM Tickets pricing and purchase terms have not been confirmed for this page.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">
        ARAM Tickets
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">
        Pricing details are being prepared.
      </h1>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
        This page does not quote plan prices or purchase terms. Confirm current pricing before
        making a purchase decision.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/organizer/register"
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ds-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-ds-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-strong focus-visible:ring-offset-2"
        >
          Create account
        </Link>
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
