import type { Metadata } from 'next';
import {
  ButtonLink,
  CtaBand,
  FaqList,
  FeatureIndex,
  FeatureShowcase,
  HomeHero,
  Section,
  SectionIntro,
  SecurityBand,
  UseCaseGrid,
  WorkflowSteps,
} from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: { absolute: 'Aram Events | Event registration, tickets and QR check-in' },
  description:
    'Build an event website, take registrations and tickets, check guests in with QR codes, and keep every attendee record in one workspace.',
  alternates: { canonical: '/' },
};

export default function MarketingHomepage() {
  return (
    <>
      <HomeHero />

      <Section tone="white" id="workflow">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            title="One event, five steps, one place."
            lead="Everything you set up early on, like ticket types and capacity, carries through to check-in and the numbers afterwards."
          />
          <ButtonLink href="/how-it-works" variant="secondary" className="self-start lg:self-auto">
            See how it works
          </ButtonLink>
        </div>
        <WorkflowSteps />
      </Section>

      <Section id="features">
        <SectionIntro
          title="The tools your event team actually uses."
          lead="Six parts of one workspace, all working from the same event and the same attendee list."
        />
        <div className="mt-12">
          <FeatureIndex />
        </div>
        <div className="mt-24">
          <FeatureShowcase keys={['website', 'registration', 'checkin']} />
        </div>
        <div className="mt-16">
          <ButtonLink href="/features" variant="secondary">
            Explore all features
          </ButtonLink>
        </div>
      </Section>

      <Section tone="white" id="solutions">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro title="Built for the events you run." lead="Pick the parts you need. Leave the rest switched off." />
          <ButtonLink href="/solutions" variant="secondary" className="self-start lg:self-auto">
            See solutions
          </ButtonLink>
        </div>
        <UseCaseGrid />
      </Section>

      <SecurityBand />

      <Section id="faq">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro title="Questions organizers ask first." lead="Something else on your mind? Send us a message and we will reply by email." />
          <FaqList />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
