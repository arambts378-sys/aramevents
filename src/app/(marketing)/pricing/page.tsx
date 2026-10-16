import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Public ARAM Tickets pricing and purchase terms have not been confirmed for this page.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#5B3FE8]">
        ARAM Tickets
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#17152B] sm:text-5xl">
        Pricing details are being prepared.
      </h1>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-[#77738A]">
        This page does not quote plan prices or purchase terms. Confirm current pricing before
        making a purchase decision.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/organizer/register"
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#7C5CFC] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FE8] focus-visible:ring-offset-2"
        >
          Create account
        </Link>
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
