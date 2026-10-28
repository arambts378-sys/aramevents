import type { Metadata } from 'next';
import { CtaBand, PageHero, Section, UseCaseGrid } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'How conferences, walkathons, workshops and corporate events use Aram Events for registration, tickets and QR check-in.',
  alternates: { canonical: '/solutions' },
};

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        title="The same workspace, set up for your kind of event."
        lead="Conferences need halls and speakers; walkathons need distances and start lines. Turn on what fits."
      />
      <Section tone="white">
        <UseCaseGrid detailed />
      </Section>
      <CtaBand title="Not sure it fits your event?" lead="Tell us what you are running and we will tell you honestly whether Aram Events is a good fit." />
    </>
  );
}
