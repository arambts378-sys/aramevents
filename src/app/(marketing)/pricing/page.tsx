import type { Metadata } from 'next';
import Link from 'next/link';
import { ADDITIONAL_SERVICES, GST_NOTE, PRICING_HEADLINE, PUBLIC_PRICING } from '@/lib/marketing/pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Aram Events pricing per event: Free up to 100 attendees, Essential ₹1,999, Professional ₹4,999, Business ₹12,999, and custom Enterprise plans. Prices exclude GST.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-ds-accent-strong">Pricing</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[0.01em] text-ds-ink sm:text-5xl">
          {PRICING_HEADLINE}
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
          Pay per event, sized to your attendee count. Start free and upgrade only the events that need more.
        </p>
      </div>

      <div data-assist-tip="pricing" className="mt-14 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PUBLIC_PRICING.map((tier) => {
          const custom = !tier.priceNote && tier.price !== '₹0';
          return (
            <section
              key={tier.id}
              aria-labelledby={`plan-${tier.id}`}
              // Subgrid: each card's six parts (name, audience, price, attendees, button, features)
              // share row heights with the cards beside it, so every price and button lines up.
              style={{ gridRow: 'span 6', gridTemplateRows: 'subgrid', rowGap: 0 }}
              className={`relative grid rounded-2xl p-6 ${
                tier.popular
                  ? 'bg-stage-night text-white shadow-[0_30px_70px_-30px_rgba(27,16,53,0.8)]'
                  : 'border border-ds-line bg-white shadow-xs'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-stage-lamp px-3 py-1 text-[12px] font-bold text-stage-ink">
                  Most popular
                </span>
              )}

              <h2 id={`plan-${tier.id}`} className={`font-display text-xl font-bold ${tier.popular ? 'text-white' : 'text-ds-ink'}`}>
                {tier.name}
              </h2>
              <p className={`mt-1 text-[13.5px] leading-snug ${tier.popular ? 'text-white/65' : 'text-ds-muted'}`}>
                {tier.audience}
              </p>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span
                  className={`font-display font-bold tracking-[0.01em] whitespace-nowrap ${custom ? 'text-[24px] leading-[40px]' : 'text-[34px] leading-[40px]'} ${
                    tier.popular ? 'text-white' : 'text-ds-ink'
                  }`}
                >
                  {tier.price}
                </span>
                {tier.priceNote && (
                  <span className={`text-[13.5px] ${tier.popular ? 'text-white/60' : 'text-ds-muted'}`}>{tier.priceNote}</span>
                )}
              </p>

              <div className="mt-3">
                <p
                  className={`inline-flex w-fit items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold ${
                    tier.popular ? 'bg-white/10 text-white' : 'bg-ds-accent-soft text-ds-accent-strong'
                  }`}
                >
                  <span className="material-symbols-outlined mt-px text-[16px]" aria-hidden="true">group</span>
                  {tier.attendees}
                </p>
              </div>

              <Link
                href={tier.cta.href}
                className={`mt-3 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  tier.popular
                    ? 'bg-stage-lamp text-stage-ink hover:bg-white focus-visible:ring-white focus-visible:ring-offset-stage-night'
                    : 'border border-ds-line bg-white text-ds-ink hover:bg-ds-subtle focus-visible:ring-ds-accent'
                }`}
              >
                {tier.cta.label}
              </Link>

              <div className={`mt-6 border-t pt-5 ${tier.popular ? 'border-white/10' : 'border-ds-line'}`}>
                {tier.includesFrom && (
                  <p className={`mb-3 text-[13px] font-semibold ${tier.popular ? 'text-white' : 'text-ds-ink'}`}>
                    Everything in {tier.includesFrom}, plus:
                  </p>
                )}
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-[13.5px] leading-snug ${tier.popular ? 'text-white/85' : 'text-ds-body'}`}>
                      <span
                        className={`material-symbols-outlined mt-px shrink-0 text-[17px] ${tier.popular ? 'text-stage-lamp' : 'text-ds-accent'}`}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-ds-line bg-white p-6 sm:p-7">
        <h2 className="font-display text-lg font-bold text-ds-ink">Additional services</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ds-muted">{ADDITIONAL_SERVICES}</p>
        <p className="mt-4 text-[13.5px] font-medium text-ds-ink">{GST_NOTE}</p>
      </div>

      <p className="mt-8 text-center text-sm text-ds-muted">
        Not sure which plan fits?{' '}
        <Link href="/contact" className="font-semibold text-ds-accent-strong hover:underline">
          Talk to us
        </Link>
        .
      </p>
    </div>
  );
}
