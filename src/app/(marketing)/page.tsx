import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ConnectedPlatformSection } from '@/components/marketing/ConnectedPlatformSection';
import { CreateEventSection } from '@/components/marketing/CreateEventSection';
import { EventOperationsSection } from '@/components/marketing/EventOperationsSection';
import { PeopleDataSection } from '@/components/marketing/PeopleDataSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Event registration, tickets and check-in | ARAM Tickets',
  description:
    'Build an event website, manage registrations and tickets, coordinate event teams, and check guests in with ARAM Tickets.',
  openGraph: {
    title: 'ARAM Tickets | Event registration, tickets and check-in',
    description:
      'Event websites, registration, ticket management, QR check-in and event analytics in one workspace.',
    type: 'website',
  },
};

export default function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-[#F7F5FF] font-sans antialiased text-[#17152B] selection:bg-[#7C5CFC] selection:text-white">
      <Hero />
      <ConnectedPlatformSection />
      <CreateEventSection />
      <EventOperationsSection />
      <PeopleDataSection />
      <FinalCTA />
    </div>
  );
}
