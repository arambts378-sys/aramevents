import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: {
    default: "ARAM Tickets",
    template: "%s | ARAM Tickets",
  },
  description:
    "Build event websites, manage registrations and tickets, check attendees in with QR codes, and review event activity.",
  openGraph: {
    type: "website",
    siteName: "ARAM Tickets",
    title: "ARAM Tickets",
    description:
      "Event websites, registration, ticket management, QR check-in and event analytics in one workspace.",
  },
  twitter: {
    card: "summary",
    title: "ARAM Tickets",
    description:
      "Event websites, registration, ticket management, QR check-in and event analytics in one workspace.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ds-canvas">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
