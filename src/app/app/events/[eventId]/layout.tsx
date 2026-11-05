import React from 'react';
import { EventSetupShell } from '@/components/events/setup/EventSetupShell';

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <EventSetupShell>{children}</EventSetupShell>;
}
