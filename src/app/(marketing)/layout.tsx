import React from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { SITE_URL } from "@/lib/site";

// Display face for the public website only; the product UI stays on Geist.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const DESCRIPTION =
  "Event websites, registration and tickets, QR check-in, attendee management, team access and analytics in one workspace.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aram Events",
    template: "%s | Aram Events",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Aram Events",
    url: SITE_URL,
    title: "Aram Events",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Aram Events",
    description: DESCRIPTION,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bricolage.variable} flex min-h-screen flex-col bg-mk-paper font-sans text-mk-ink antialiased`}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-mk-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
