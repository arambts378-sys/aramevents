import type { Metadata } from 'next';
import { CtaBand, PageHero, Section, SectionIntro } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'About',
  description: 'Aram Events is built by WisRight Technologies for teams who run conferences, walkathons, workshops and community events.',
  alternates: { canonical: '/about' },
};

export default function AboutUsPage() {
  return (
    <>
      <PageHero
        title="Event work, brought together."
        lead="The registration form, the guest list, the tickets and the check-in at the door usually live in different tools. Aram Events puts them in one workspace."
      />
      <Section tone="white">
        <SectionIntro
          title="Built by WisRight Technologies."
          lead="We build Aram Events for teams who run conferences, walkathons, workshops and community events, and we keep the product honest about what it does today."
        />
      </Section>
      <CtaBand />
    </>
  );
}
