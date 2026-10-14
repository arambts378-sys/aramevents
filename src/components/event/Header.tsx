"use client";

import { useState } from "react";
import Link from "next/link";
import { HeaderVariant } from "@/data/templates";

interface HeaderProps {
  event?: any;
  section?: any;
  websiteConfig?: any;
  variant?: HeaderVariant;
}

export default function Header({ event, section, websiteConfig, variant = "sticky-blur" }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const content = section?.content || {};
  const logoText = content.logoText || event?.name || "ARAM BTS";
  const showLogoText = content.showLogoText ?? true;
  const ctaText = content.ctaText || "Register Now";
  const showCta = content.showCta ?? true;
  const ctaDest = content.ctaDest || `/events/${event?.slug || event?.id}/register`;

  // Generate nav links based on visible sections
  const possibleNavSections = [
    { id: 'about', label: 'About' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'venue', label: 'Venue' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'exhibitors', label: 'Exhibitors' },
    { id: 'contact', label: 'Contact' },
  ];

  const navLinks = possibleNavSections
    .filter(nav => {
      const sec = websiteConfig?.sections?.find((s: any) => s.id === nav.id);
      return sec && sec.visible;
    })
    .map(nav => ({ label: nav.label, href: `#${nav.id}` }));

  // Variant classes
  const isFloating = variant === "floating";
  const isTransparent = variant === "transparent";
  const isMinimal = variant === "minimal";
  const isSolid = variant === "solid";

  const headerContainerClass = isFloating
    ? "sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
    : isTransparent
    ? "absolute top-0 left-0 right-0 z-50 w-full bg-transparent"
    : isSolid
    ? "sticky top-0 z-50 w-full bg-brand-white border-b-2 border-brand-dark"
    : "sticky top-0 z-50 w-full bg-brand-soft/90 backdrop-blur-md border-b border-brand-border";

  const innerNavClass = isFloating
    ? "bg-brand-white/95 backdrop-blur-md rounded-full px-6 shadow-md border border-brand-border flex justify-between items-center h-16"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20";

  return (
    <header className={headerContainerClass}>
      <div className={innerNavClass}>
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center">
          {showLogoText && (
            <Link href="/" className="text-xl font-bold text-brand-dark tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-maroon"></span>
              <span>{logoText}</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        {!isMinimal && (
          <nav className="hidden md:flex space-x-7">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs uppercase tracking-wider font-semibold text-brand-dark hover:text-brand-maroon transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center">
          {showCta && (
            <Link
              href={ctaDest}
              className={`inline-flex items-center justify-center text-xs uppercase tracking-wider font-bold transition-all ${
                isFloating
                  ? "px-5 py-2 rounded-full text-white bg-brand-maroon hover:bg-brand-deep-maroon shadow-xs"
                  : "px-6 py-2.5 rounded-md text-white bg-brand-maroon hover:bg-brand-deep-maroon shadow-xs"
              }`}
            >
              {ctaText}
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-brand-dark hover:text-brand-maroon hover:bg-brand-border/50 focus:outline-none"
            aria-controls="mobile-menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {!isMobileMenuOpen ? (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            ) : (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-brand-white shadow-lg" id="mobile-menu">
          <div className="px-4 pt-3 pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block px-3 py-2 rounded-md text-sm font-semibold text-brand-dark hover:text-brand-maroon hover:bg-brand-soft"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {showCta && (
              <Link
                href={ctaDest}
                className="block w-full text-center mt-4 px-3 py-2.5 rounded-md text-sm font-bold text-white bg-brand-maroon hover:bg-brand-deep-maroon uppercase tracking-wider"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
