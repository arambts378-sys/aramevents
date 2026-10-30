import type { Metadata } from 'next';
import Link from 'next/link';
import { PUBLIC_PRICING } from '@/lib/marketing/pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Aram Events pricing per event: Free up to 100 attendees, Essential ₹1,499, Professional ₹3,999, Business ₹9,999, and custom Enterprise plans.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">Pricing</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">
          Recommended ARAM Events pricing
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
          Pay per event, sized to your attendee count. Start free and move up only when your event grows.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PUBLIC_PRICING.map((tier) => (
          <section
            key={tier.id}
            aria-labelledby={`plan-${tier.id}`}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
              tier.recommended
                ? 'border-ds-accent shadow-lg shadow-ds-accent/10 ring-1 ring-ds-accent'
                : 'border-ds-line shadow-xs'
            }`}
          >
            {tier.recommended && (
              <span className="absolute -top-3 left-6 rounded-full bg-ds-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Recommended plan
              </span>
            )}
            <h2 id={`plan-${tier.id}`} className="text-lg font-bold text-ds-ink">
              {tier.name}
            </h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-ds-ink">{tier.price}</p>
            <p className="mt-1 text-sm text-ds-muted">{tier.basis}</p>
            <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-ds-accent-soft px-3 py-1 text-xs font-semibold text-ds-accent-strong">
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">group</span>
              {tier.attendees}
            </p>
            <p className="mt-4 flex-1 text-sm leading-6 text-ds-muted">{tier.summary}</p>
            <Link
              href={tier.cta.href}
              className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-strong focus-visible:ring-offset-2 ${
                tier.recommended
                  ? 'bg-ds-accent text-white hover:bg-ds-accent-strong'
                  : 'border border-ds-line bg-white text-ds-ink hover:bg-ds-subtle'
              }`}
            >
              {tier.cta.label}
            </Link>
          </section>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-ds-muted">
        Prices are in Indian rupees. Not sure which plan fits?{' '}
        <Link href="/contact" className="font-semibold text-ds-accent-strong hover:underline">
          Talk to us
        </Link>
        .
      </p>
    </div>
  );
}
