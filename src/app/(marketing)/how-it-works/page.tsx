import type { Metadata } from 'next';
import { CtaBand, FeatureShowcase, PageHero, Section, SectionIntro, WorkflowSteps } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Create an event, publish its website, open registration, check guests in with QR codes and review the results with Aram Events.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="How an event runs on Aram Events."
        lead="Five steps from an idea to a full room. You can stop at any step and come back later; everything saves as a draft until you publish."
      />
      <Section tone="white">
        <WorkflowSteps detailed />
      </Section>
      <Section>
        <SectionIntro title="On the day." lead="What your volunteers see at the door, and what you see from the office." />
        <div className="mt-14">
          <FeatureShowcase keys={['checkin', 'analytics']} />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
