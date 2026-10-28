import type { Metadata } from 'next';
import { PLAN_DEFINITIONS, PLAN_ORDER } from '@/config/plans';
import { formatPlanPrice } from '@/services/planService';
import { ButtonLink, Check } from '@/components/marketing/site/primitives';
import { CtaBand, FaqList, PageHero, Section, SectionIntro } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Aram Events plans: start free with two active events and three team members, and upgrade when you need more.',
  alternates: { canonical: '/pricing' },
};

const limit = (n: number | null, unit: string) => (n === null ? `Unlimited ${unit}` : `${n} ${unit}`);

export default function PricingPage() {
  return (
    <>
      <PageHero
        title="Start free. Upgrade when your events grow."
        lead="Plans differ by how many events and team members you can have at once. Every plan includes registration, QR check-in and analytics."
      />
      <Section tone="white">
        <div className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLAN_DEFINITIONS[id];
            const featured = id === 'professional';
            // Paid prices in plans.ts are still proposals, so they are not quoted publicly yet.
            const price =
              plan.price.kind === 'fixed' && !plan.price.proposed ? formatPlanPrice(plan) : plan.price.kind === 'custom' ? 'Custom' : 'Price on request';
            return (
              <article
                key={id}
                className={`flex flex-col rounded-[22px] p-7 sm:p-8 ${
                  featured ? 'bg-mk-indigo text-white' : 'border border-mk-line bg-mk-paper text-mk-ink'
                }`}
              >
                <h2 className="font-display text-[1.5rem] font-semibold">{plan.name}</h2>
                <p className={`mt-2 text-[0.9375rem] ${featured ? 'text-[#CFC8F5]' : 'text-mk-body'}`}>{plan.tagline}</p>
                <p className="mt-6 font-display text-[2.5rem] font-semibold leading-none tracking-[-0.02em]">
                  {price}
                  {price === '₹0' && <span className={`ml-2 text-[1rem] font-medium ${featured ? 'text-[#CFC8F5]' : 'text-mk-muted'}`}>forever</span>}
                </p>
                <p className={`mt-4 text-[0.9375rem] font-semibold ${featured ? 'text-white' : 'text-mk-ink'}`}>
                  {plan.allowsOverrides
                    ? 'Event and team limits set for your organization'
                    : `${limit(plan.entitlements.maxActiveEvents, 'active events')}, ${limit(plan.entitlements.maxTeamMembers, 'team members').toLowerCase()}`}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[0.9375rem] leading-[1.5]">
                      <Check className={`mt-[3px] ${featured ? 'text-[#B9B0EE]' : 'text-mk-violet'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={id === 'free' ? '/organizer/register' : '/contact'}
                  variant={featured ? 'onDark' : id === 'free' ? 'primary' : 'secondary'}
                  className="mt-8"
                >
                  {id === 'free' ? 'Create free account' : 'Contact us'}
                </ButtonLink>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-[0.875rem] text-mk-muted">
          Online payment collection for paid tickets is not available yet. Archived and cancelled events do not count toward your active events.
        </p>
      </Section>
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro title="Before you choose a plan." />
          <FaqList />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
