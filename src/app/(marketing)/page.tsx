'use client';

import React from 'react';
import { Navbar } from '@/components/marketing/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { ConnectedPlatformSection } from '@/components/marketing/ConnectedPlatformSection';
import { CreateEventSection } from '@/components/marketing/CreateEventSection';
import { EventOperationsSection } from '@/components/marketing/EventOperationsSection';
import { PeopleDataSection } from '@/components/marketing/PeopleDataSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { Footer } from '@/components/marketing/Footer';

export default function MarketingHomepage() {
  return (
    <main className="min-h-screen bg-[#F7F5FF] font-sans antialiased text-[#17152B] selection:bg-[#7C5CFC] selection:text-white">
      {/* HEADER */}
      <Navbar />

      {/* 01. HERO */}
      <Hero />

      {/* 02. ONE CONNECTED EVENT SYSTEM */}
      <ConnectedPlatformSection />

      {/* 03. CREATE YOUR EVENT EASILY */}
      <CreateEventSection />

      {/* 04. EVENT DAY / OPERATIONS */}
      <EventOperationsSection />

      {/* 05. PEOPLE + DATA + OUTCOMES */}
      <PeopleDataSection />

      {/* 06. FINAL CTA */}
      <FinalCTA />

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
