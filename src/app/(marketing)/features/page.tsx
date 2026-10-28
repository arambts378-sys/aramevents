import type { Metadata } from 'next';
import { CtaBand, FeatureIndex, FeatureShowcase, PageHero, Section } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Event websites, registration and tickets, QR check-in, attendee management, team access and analytics in Aram Events.',
  alternates: { canonical: '/features' },
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        title="Everything an event needs, from the first page to the final count."
        lead="Each tool works from the same event and the same attendee list, so nothing is copied between spreadsheets."
      >
        <div className="mt-14">
          <FeatureIndex />
        </div>
      </PageHero>
      <Section tone="white">
        <FeatureShowcase />
      </Section>
      <CtaBand title="Try every feature on the Free plan." lead="Two active events and three team members, with no time limit." />
    </>
  );
}
